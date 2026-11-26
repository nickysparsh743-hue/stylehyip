import { createSupabaseAdminClient } from '../supabase/admin';
import { createSupabaseServerClient } from '../supabase/server';

export function normalizeSlug(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mapProduct(product) {
  const inventory = Array.isArray(product.inventory) ? product.inventory[0] : product.inventory;
  const authoritativeStock = inventory?.stock ?? product.stock ?? 0;
  const categoryImageUrl = product.categories?.background_image_url || null;

  return {
    ...product,
    slug: normalizeSlug(product.slug),
    name: String(product.name ?? '').trim(),
    description: String(product.description ?? '').trim(),
    image_url: product.image_url || null,
    category_image_url: categoryImageUrl,
    image: product.image_url || categoryImageUrl || product.image || '/placeholder-product.jpg',
    badge: product.is_featured ? 'Featured' : 'New',
    rating: 5,
    reviews: 12,
    stock: authoritativeStock,
    category: product.categories?.slug || null,
    category_name: product.categories?.name || null,
  };
}

function buildSearchClause(term) {
  const sanitized = String(term || '').trim();
  if (!sanitized) {
    return '';
  }

  const normalized = sanitized.replace(/[%_]/g, '').replace(/\s+/g, ' ');
  if (!normalized) {
    return '';
  }

  return [
    `name.ilike.%${normalized}%`,
    `description.ilike.%${normalized}%`,
    `slug.ilike.%${normalized}%`,
    `categories.name.ilike.%${normalized}%`,
  ].join(',');
}

export function rankSearchResults(products, searchTerm) {
  const normalizedQuery = String(searchTerm || '').trim().toLowerCase();
  if (!normalizedQuery) {
    return products;
  }

  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);

  return [...products]
    .map((product) => {
      const name = String(product.name || '').toLowerCase();
      const description = String(product.description || '').toLowerCase();
      const categoryName = String(product.category_name || product.categories?.name || '').toLowerCase();
      const slug = String(product.slug || '').toLowerCase();

      let score = 0;

      if (name === normalizedQuery) score += 100;
      if (name.includes(normalizedQuery)) score += 80;
      if (slug.includes(normalizedQuery)) score += 70;
      if (categoryName.includes(normalizedQuery)) score += 60;

      for (const word of queryWords) {
        if (!word) continue;
        if (name.includes(word)) score += 25;
        if (description.includes(word)) score += 12;
        if (categoryName.includes(word)) score += 18;
        if (slug.includes(word)) score += 10;
      }

      return { product, score };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .map(({ product }) => product);
}

export async function getProducts({ search = '', categorySlug = '', categoryId = '', featured = false, limit = null } = {}) {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from('products')
    .select('id, slug, name, description, price, stock, image_url, is_featured, created_at, category_id, categories(name, slug, background_image_url), inventory(stock)')
    .order('created_at', { ascending: false });

  if (featured) {
    query = query.eq('is_featured', true);
  }

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  if (categorySlug) {
    query = query.eq('categories.slug', categorySlug);
  }

  if (search) {
    const terms = search.trim().split(/\s+/).filter(Boolean);
    const clauses = terms
      .map(buildSearchClause)
      .filter(Boolean);

    if (clauses.length > 0) {
      query = query.or(clauses.join(','));
    }
  }

  if (limit !== null && limit !== undefined && Number(limit) > 0) {
    query = query.limit(Number(limit));
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data || []).map(mapProduct);
}

export async function getProductBySlug(slug) {
  const supabase = createSupabaseAdminClient();
  const requestedSlug = normalizeSlug(slug);

  const { data, error } = await supabase
    .from('products')
    .select('id, slug, name, description, price, stock, image_url, is_featured, created_at, category_id, categories(name, slug, background_image_url), inventory(stock)')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  const product = (data || []).find((item) => normalizeSlug(item.slug) === requestedSlug);
  if (!product) {
    throw new Error('Product not found.');
  }

  return mapProduct(product);
}

export async function createProduct(payload) {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const { stock = 0, lowStockThreshold = 5, sku = '', ...productPayload } = payload;
  const initialStock = Number(stock);
  const threshold = Number(lowStockThreshold);
  if (!Number.isInteger(initialStock) || initialStock < 0) throw new Error('Initial stock must be a non-negative integer.');
  const { data, error } = await supabase.from('products').insert({ ...productPayload, stock: 0 }).select('*').single();
  if (error) throw error;
  const { error: inventoryError } = await admin.from('inventory').upsert({ product_id: data.id, stock: initialStock, low_stock_threshold: threshold, sku: sku || null, updated_at: new Date().toISOString() }, { onConflict: 'product_id' });
  if (inventoryError) throw inventoryError;
  if (initialStock > 0) {
    await admin.from('inventory_movements').insert({ product_id: data.id, movement_type: 'stock_received', quantity: initialStock, previous_stock: 0, new_stock: initialStock, reason: 'Initial product inventory' });
  }
  return data;
}

export async function updateProduct(id, payload) {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const { stock, lowStockThreshold, sku, ...productPayload } = payload;
  const { data, error } = await supabase.from('products').update(productPayload).eq('id', id).select('*').single();
  if (error) throw error;
  if (stock !== undefined || lowStockThreshold !== undefined || sku !== undefined) {
    const { data: current } = await admin.from('inventory').select('*').eq('product_id', id).maybeSingle();
    const nextStock = stock === undefined ? Number(current?.stock || 0) : Number(stock);
    const nextThreshold = lowStockThreshold === undefined ? Number(current?.low_stock_threshold ?? 5) : Number(lowStockThreshold);
    if (!Number.isInteger(nextStock) || nextStock < 0) throw new Error('Stock must be a non-negative integer.');
    if (!Number.isInteger(nextThreshold) || nextThreshold < 0) throw new Error('Threshold must be a non-negative integer.');
    await admin.from('inventory').update({ low_stock_threshold: nextThreshold, sku: sku || current?.sku || null, updated_at: new Date().toISOString() }).eq('product_id', id);
    if (stock !== undefined && nextStock !== Number(current?.stock || 0)) {
      const { error: adjustError } = await admin.rpc('manual_inventory_adjust', { p_product_id: id, p_operation: 'adjust', p_quantity: nextStock, p_reason: 'Product inventory edited', p_reference: null, p_performed_by: null });
      if (adjustError) throw adjustError;
    }
  }
  return data;
}

export async function deleteProduct(id) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('products').delete().eq('id', id);

  if (error) {
    throw error;
  }

  return true;
}
