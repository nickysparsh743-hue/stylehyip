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

export async function createCategory({ name, slug, description }) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('categories').insert({ name, slug, description }).select('*').single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateCategory(id, { name, slug, description }) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('categories').update({ name, slug, description }).eq('id', id).select('*').single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteCategory(id) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('categories').delete().eq('id', id);

  if (error) {
    throw error;
  }

  return true;
}
