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
  return {
    ...product,
    slug: normalizeSlug(product.slug),
    name: String(product.name ?? '').trim(),
    description: String(product.description ?? '').trim(),
    image_url: product.image_url || null,
    image: product.image_url || product.image || '/placeholder-product.jpg',
    badge: product.is_featured ? 'Featured' : 'New',
    rating: 5,
    reviews: 12,
    stock: product.stock ?? 0,
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
    .select('id, slug, name, description, price, stock, image_url, is_featured, created_at, category_id, categories(name, slug)')
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
    .select('id, slug, name, description, price, stock, image_url, is_featured, created_at, category_id, categories(name, slug)')
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
  const { data, error } = await supabase.from('products').insert(payload).select('*').single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateProduct(id, payload) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('products').update(payload).eq('id', id).select('*').single();

  if (error) {
    throw error;
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
