import { supabase } from './supabaseClient';

// Drop-in replacement for base44.entities.Cycle.*
// Cycles are stored in Supabase with intervals as a JSONB column.
export const Cycle = {
  async filter(where = {}, sort = null) {
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
    const { data: created, error } = await supabase
      .from('cycles')
      .insert({ ...data, intervals: data.intervals || [] })
      .select()
      .single();
    if (error) throw error;
    return created;
  },

  async update(id, data) {
    const { data: updated, error } = await supabase
      .from('cycles')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return updated;
  },

  async delete(id) {
    const { error } = await supabase.from('cycles').delete().eq('id', id);
    if (error) throw error;
  },
};
