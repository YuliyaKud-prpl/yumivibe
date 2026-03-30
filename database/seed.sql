-- YumiVibe Seed Data
-- Run with: psql $DATABASE_URL -f database/seed.sql
-- Passwords are bcrypt hashes of 'password123'

-- =============================================================================
-- Users
-- =============================================================================
INSERT INTO users (id, email, password_hash, display_name, role) VALUES
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'admin@yumivibe.com',
    '$2b$10$K4GxKq8XqkZ3r9E1Q8v0YO.HqKjL6m4zN5p3R7S9T1U3V5W7X9Y1Z',
    'Yuliya',
    'admin'
  ),
  (
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'user@yumivibe.com',
    '$2b$10$K4GxKq8XqkZ3r9E1Q8v0YO.HqKjL6m4zN5p3R7S9T1U3V5W7X9Y1Z',
    'Demo User',
    'user'
  );

-- =============================================================================
-- Dashboards for Admin (Yuliya)
-- =============================================================================
INSERT INTO dashboards (id, user_id, name, theme, background, background_type) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Morning Routine',
    'light',
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'gradient'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Work Focus',
    'dark',
    '#1a1a2e',
    'color'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Chill Vibes',
    'dark',
    'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
    'gradient'
  );

-- =============================================================================
-- Dashboards for Demo User
-- =============================================================================
INSERT INTO dashboards (id, user_id, name, theme, background, background_type) VALUES
  (
    '44444444-4444-4444-4444-444444444444',
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'My Dashboard',
    'light',
    '#ffffff',
    'color'
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'Study Session',
    'light',
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    'gradient'
  ),
  (
    '66666666-6666-6666-6666-666666666666',
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'Weekend Playlist',
    'dark',
    '#16213e',
    'color'
  );

-- =============================================================================
-- Blocks for "Morning Routine" dashboard
-- =============================================================================
INSERT INTO blocks (dashboard_id, type, title, content, layout_x, layout_y, layout_w, layout_h, sort_order) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'greeting', 'Hello!', '{}',
    0, 0, 6, 2, 0
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'clock', 'Clock', '{}',
    6, 0, 3, 2, 1
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'weather', 'Weather', '{"city": "New York", "units": "imperial"}',
    0, 2, 4, 4, 2
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'todos', 'Morning Tasks', '{"items": [{"id": "t1", "text": "Stretch for 10 minutes", "done": false}, {"id": "t2", "text": "Make breakfast", "done": true}, {"id": "t3", "text": "Review calendar", "done": false}, {"id": "t4", "text": "Check emails", "done": false}]}',
    4, 2, 4, 4, 3
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'quotes', 'Daily Quote', '{"currentQuote": "The only way to do great work is to love what you do.", "author": "Steve Jobs"}',
    8, 2, 4, 3, 4
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'notes', 'Quick Notes', '{"text": "Remember to water the plants!\nGrocery list: eggs, milk, bread"}',
    0, 6, 4, 3, 5
  );

-- =============================================================================
-- Blocks for "Work Focus" dashboard
-- =============================================================================
INSERT INTO blocks (dashboard_id, type, title, content, layout_x, layout_y, layout_w, layout_h, sort_order) VALUES
  (
    '22222222-2222-2222-2222-222222222222',
    'title', 'Focus Mode', '{}',
    0, 0, 12, 1, 0
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'pomodoro', 'Pomodoro Timer', '{"workMinutes": 25, "breakMinutes": 5}',
    0, 1, 4, 4, 1
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'todos', 'Sprint Tasks', '{"items": [{"id": "s1", "text": "Fix login bug", "done": true}, {"id": "s2", "text": "Write unit tests", "done": false}, {"id": "s3", "text": "Code review PR #42", "done": false}, {"id": "s4", "text": "Update API docs", "done": false}, {"id": "s5", "text": "Deploy staging", "done": false}]}',
    4, 1, 4, 4, 2
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'notes', 'Meeting Notes', '{"text": "Standup at 10am\n- Discuss auth migration\n- Review performance metrics\n- Plan sprint review"}',
    8, 1, 4, 4, 3
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'clock', 'Time', '{}',
    0, 5, 3, 2, 4
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'timer', 'Break Timer', '{"duration": 600, "remaining": 600}',
    3, 5, 3, 2, 5
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'spotify', 'Focus Playlist', '{"embedUrl": "https://open.spotify.com/embed/playlist/37i9dQZF1DX5trt9i14X7j"}',
    6, 5, 6, 3, 6
  );

-- =============================================================================
-- Blocks for "Chill Vibes" dashboard
-- =============================================================================
INSERT INTO blocks (dashboard_id, type, title, content, layout_x, layout_y, layout_w, layout_h, sort_order) VALUES
  (
    '33333333-3333-3333-3333-333333333333',
    'greeting', 'Hey there!', '{}',
    0, 0, 6, 2, 0
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'youtube', 'Lofi Stream', '{"videoUrl": "https://www.youtube.com/watch?v=jfKfPfyJRdk"}',
    0, 2, 6, 4, 1
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'spotify', 'Chill Beats', '{"embedUrl": "https://open.spotify.com/embed/playlist/37i9dQZF1DWWQRwui0ExPn"}',
    6, 0, 6, 3, 2
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'quotes', 'Inspiration', '{"currentQuote": "Almost everything will work again if you unplug it for a few minutes, including you.", "author": "Anne Lamott"}',
    6, 3, 6, 3, 3
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'notes', 'Journal', '{"text": "Today I am grateful for:\n1. Good coffee\n2. Sunny weather\n3. Making progress on my project"}',
    0, 6, 6, 3, 4
  );

-- =============================================================================
-- Blocks for "My Dashboard" (Demo User)
-- =============================================================================
INSERT INTO blocks (dashboard_id, type, title, content, layout_x, layout_y, layout_w, layout_h, sort_order) VALUES
  (
    '44444444-4444-4444-4444-444444444444',
    'greeting', 'Welcome!', '{}',
    0, 0, 6, 2, 0
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'clock', 'Clock', '{}',
    6, 0, 3, 2, 1
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'weather', 'Weather', '{"city": "London", "units": "metric"}',
    9, 0, 3, 4, 2
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'todos', 'To Do', '{"items": [{"id": "d1", "text": "Try adding a new block", "done": false}, {"id": "d2", "text": "Customize the background", "done": false}, {"id": "d3", "text": "Drag blocks around", "done": false}]}',
    0, 2, 4, 4, 3
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'notes', 'Notes', '{"text": "Welcome to YumiVibe! This is your personal dashboard."}',
    4, 2, 5, 3, 4
  );

-- =============================================================================
-- Blocks for "Study Session" (Demo User)
-- =============================================================================
INSERT INTO blocks (dashboard_id, type, title, content, layout_x, layout_y, layout_w, layout_h, sort_order) VALUES
  (
    '55555555-5555-5555-5555-555555555555',
    'title', 'Study Time', '{}',
    0, 0, 12, 1, 0
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'pomodoro', 'Study Timer', '{"workMinutes": 50, "breakMinutes": 10}',
    0, 1, 4, 4, 1
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'todos', 'Study Plan', '{"items": [{"id": "st1", "text": "Read Chapter 5", "done": true}, {"id": "st2", "text": "Complete practice problems", "done": false}, {"id": "st3", "text": "Review flashcards", "done": false}, {"id": "st4", "text": "Write summary notes", "done": false}, {"id": "st5", "text": "Practice quiz", "done": false}]}',
    4, 1, 4, 4, 2
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'notes', 'Key Concepts', '{"text": "Important formulas:\n- E = mc^2\n- F = ma\n- V = IR"}',
    8, 1, 4, 4, 3
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'youtube', 'Study Music', '{"videoUrl": "https://www.youtube.com/watch?v=jfKfPfyJRdk"}',
    0, 5, 6, 4, 4
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'quotes', 'Motivation', '{"currentQuote": "Education is the most powerful weapon which you can use to change the world.", "author": "Nelson Mandela"}',
    6, 5, 6, 3, 5
  );

-- =============================================================================
-- Blocks for "Weekend Playlist" (Demo User)
-- =============================================================================
INSERT INTO blocks (dashboard_id, type, title, content, layout_x, layout_y, layout_w, layout_h, sort_order) VALUES
  (
    '66666666-6666-6666-6666-666666666666',
    'greeting', 'Happy Weekend!', '{}',
    0, 0, 6, 2, 0
  ),
  (
    '66666666-6666-6666-6666-666666666666',
    'clock', 'Time', '{}',
    6, 0, 3, 2, 1
  ),
  (
    '66666666-6666-6666-6666-666666666666',
    'youtube', 'Music Video', '{"videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}',
    0, 2, 6, 4, 2
  ),
  (
    '66666666-6666-6666-6666-666666666666',
    'spotify', 'Weekend Mix', '{"embedUrl": "https://open.spotify.com/embed/playlist/37i9dQZF1DX2sUQwD7tbmL"}',
    6, 2, 6, 4, 3
  ),
  (
    '66666666-6666-6666-6666-666666666666',
    'todos', 'Weekend Plans', '{"items": [{"id": "w1", "text": "Brunch with friends", "done": false}, {"id": "w2", "text": "Go for a hike", "done": false}, {"id": "w3", "text": "Movie night", "done": false}]}',
    0, 6, 6, 3, 4
  ),
  (
    '66666666-6666-6666-6666-666666666666',
    'weather', 'Weather', '{"city": "San Francisco", "units": "imperial"}',
    9, 0, 3, 2, 5
  );
