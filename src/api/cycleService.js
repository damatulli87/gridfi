import { supabase } from './supabaseClient';

export const Cycle = {
  async filter(where = {}, sort = null) {
    // RLS owner_only policy handles user filtering automatically
    let query = supabase.from('cycles').select('*');
    Object.entries(where).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    if (sort) {
      const desc = sort.startsWith('-');
      const col = desc ? sort.slice(1) : sort;
      query = query.order(col, { ascending: !desc });
    } else {
      query = query.order('created_at', { ascending: false });
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async create(data) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: created, error } = await supabase
      .from('cycles')
      .insert({ ...data, intervals: data.intervals || [], user_id: user?.id })
      .select()
      .single();
    if (error) throw error;
    return created;
  },

  async update(id, data) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: updated, error } = await supabase
      .from('cycles')
      .update(data)
      .eq('id', id)
      .eq('user_id', user?.id)
      .select()
      .single();
    if (error) throw error;
    return updated;
  },

  async delete(id) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('cycles')
      .delete()
      .eq('id', id)
      .eq('user_id', user?.id);
    if (error) throw error;
  },
};
