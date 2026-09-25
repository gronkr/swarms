import { createClient } from '@supabase/supabase-js';

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

export default async () => {
  const [agents, launches, messages, next] = await Promise.all([
    db.from('agents').select('id,handle,name,species,persona,strategy,lessons,color,generation,parents,alive,born_at,died_at,cause_of_death,launches,total_volume,best_mc').order('born_at'),
    db.from('launches').select('id,agent_id,name,symbol,mint,narrative,reasoning,image_url,created_at,volume_usd,mc_usd,ath_mc_usd,score,debriefed').order('created_at', { ascending: false }).limit(200),
    db.from('messages').select('id,agent_id,kind,body,launch_id,reply_to,created_at').order('created_at', { ascending: false }).limit(200),
    db.from('colony_state').select('key,value').in('key', ['next_launch_at', 'next_evolve_at', 'config']),
  ]);
  const st = Object.fromEntries((next.data || []).map((r) => [r.key, r.value]));
  const body = {
    config: {
      x: process.env.X_URL || 'https://x.com/swarmsfun',
      paused: ['1','true','on'].includes(String(process.env.KILL_SWITCH || '').trim().toLowerCase()),
    },
    next_launch_at: st.next_launch_at || null,
    next_evolve_at: st.next_evolve_at || null,
    timing: st.config || { launch_every_min: 20, debrief_after_min: 60, evolve_every_hours: 24 },
    agents: agents.data || [],
    launches: launches.data || [],
    messages: (messages.data || []).reverse(),
  };
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=5' },
  });
};
