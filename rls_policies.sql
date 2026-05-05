-- Enable RLS on all tables
alter table play_counts enable row level security;
alter table multiplayer_rooms enable row level security;
alter table mp_players enable row level security;
alter table mp_blocks enable row level security;
alter table mp_chat enable row level security;
alter table mp_chests enable row level security;
alter table comments enable row level security;

-- Drop existing policies if any (safe to re-run)
drop policy if exists "public read" on play_counts;
drop policy if exists "public increment" on play_counts;
drop policy if exists "public read rooms" on multiplayer_rooms;
drop policy if exists "public create room" on multiplayer_rooms;
drop policy if exists "public update room" on multiplayer_rooms;
drop policy if exists "public delete old rooms" on multiplayer_rooms;
drop policy if exists "public read players" on mp_players;
drop policy if exists "public upsert player" on mp_players;
drop policy if exists "public delete stale players" on mp_players;
drop policy if exists "public read blocks" on mp_blocks;
drop policy if exists "public insert block" on mp_blocks;
drop policy if exists "public delete old blocks" on mp_blocks;
drop policy if exists "public read chat" on mp_chat;
drop policy if exists "public send chat" on mp_chat;
drop policy if exists "public delete old chat" on mp_chat;
drop policy if exists "public read chests" on mp_chests;
drop policy if exists "public upsert chest" on mp_chests;
drop policy if exists "public delete old chests" on mp_chests;
drop policy if exists "public read comments" on comments;
drop policy if exists "public post comment" on comments;
drop policy if exists "public delete old comments" on comments;

-- play_counts: anyone can read and increment
CREATE POLICY "public read" ON play_counts FOR SELECT USING (true);
CREATE POLICY "public increment" ON play_counts FOR UPDATE USING (true) WITH CHECK (true);

-- multiplayer_rooms: anyone can read active rooms, create, update last_active
CREATE POLICY "public read rooms" ON multiplayer_rooms FOR SELECT USING (true);
CREATE POLICY "public create room" ON multiplayer_rooms FOR INSERT WITH CHECK (length(code) = 6);
CREATE POLICY "public update room" ON multiplayer_rooms FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public delete old rooms" ON multiplayer_rooms FOR DELETE USING (last_active < now() - interval '2 hours');

-- mp_players: anyone can read, anyone can upsert, auto-delete stale
CREATE POLICY "public read players" ON mp_players FOR SELECT USING (true);
CREATE POLICY "public upsert player" ON mp_players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public delete stale players" ON mp_players FOR DELETE USING (updated_at < now() - interval '5 minutes');

-- mp_blocks: anyone can read, anyone can insert, auto-delete old
CREATE POLICY "public read blocks" ON mp_blocks FOR SELECT USING (true);
CREATE POLICY "public insert block" ON mp_blocks FOR INSERT WITH CHECK (true);
CREATE POLICY "public delete old blocks" ON mp_blocks FOR DELETE USING (updated_at < now() - interval '1 hour');

-- mp_chat: anyone can read/send chat in a room, auto-delete old
CREATE POLICY "public read chat" ON mp_chat FOR SELECT USING (true);
CREATE POLICY "public send chat" ON mp_chat FOR INSERT WITH CHECK (length(message) <= 120);
CREATE POLICY "public delete old chat" ON mp_chat FOR DELETE USING (created_at < now() - interval '30 minutes');

-- mp_chests: anyone can read/update chests in a room, auto-delete old
CREATE POLICY "public read chests" ON mp_chests FOR SELECT USING (true);
CREATE POLICY "public upsert chest" ON mp_chests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public delete old chests" ON mp_chests FOR DELETE USING (updated_at < now() - interval '2 hours');

-- comments: anyone can read and post, auto-delete old
CREATE POLICY "public read comments" ON comments FOR SELECT USING (true);
CREATE POLICY "public post comment" ON comments FOR INSERT WITH CHECK (length(message) <= 500);
CREATE POLICY "public delete old comments" ON comments FOR DELETE USING (created_at < now() - interval '7 days');
