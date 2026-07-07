import { createSupabaseAdminClient } from '../supabase/admin';
import { createSupabaseServerClient } from '../supabase/server';

export async function getCategories() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from('categories').select('*').order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function createCategory(payload = {}) {
  const supabase = await createSupabaseServerClient();
  const { name, slug, description, background_image_url } = payload;
  const { data, error } = await supabase.from('categories').insert({ name, slug, description, background_image_url }).select('*').single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateCategory(id, payload = {}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('categories').update(payload).eq('id', id).select('*').single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteCategory(id) {
  const supabase = createSupabaseAdminClient();
  const { data: linkedProducts, error: lookupError } = await supabase.from('products').select('id').eq('category_id', id).limit(1);

  if (lookupError) {
    throw lookupError;
  }

  if ((linkedProducts || []).length > 0) {
    const error = new Error('This category still has products assigned. Move or remove them first.');
    error.code = 'CATEGORY_HAS_PRODUCTS';
    throw error;
  }

  const serverClient = await createSupabaseServerClient();
  const { error } = await serverClient.from('categories').delete().eq('id', id);

  if (error) {
    throw error;
  }

  return true;
}
