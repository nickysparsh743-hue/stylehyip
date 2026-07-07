import { createSupabaseAdminClient } from '../supabase/admin';
import { createSupabaseServerClient } from '../supabase/server';

function mapProduct(product) {
  return {
    ...product,
    image: product.image_url || '/placeholder-product.jpg',
    badge: product.is_featured ? 'Featured' : 'New',
    rating: 5,
    reviews: 12,
    stock: product.stock ?? 0,
    category: product.categories?.slug || null,
  };
}

export async function getProducts({ search = '', categorySlug = '', featured = false, limit = 12 } = {}) {
  const supabase = createSupabaseAdminClient();
  let query = supabase.from('products').select('id, slug, name, description, price, stock, image_url, is_featured, created_at, category_id, categories(name, slug)').order('created_at', { ascending: false });

  if (featured) {
    query = query.eq('is_featured', true);
  }

  if (categorySlug) {
    query = query.eq('categories.slug', categorySlug);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data || []).map(mapProduct);
}

export async function getProductBySlug(slug) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('products')
    .select('id, slug, name, description, price, stock, image_url, is_featured, created_at, category_id, categories(name, slug)')
    .eq('slug', slug)
    .single();

  if (error) {
    throw error;
  }

  return mapProduct(data);
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
