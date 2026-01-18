create table analysis_rectangles (
  id uuid default gen_random_uuid() primary key,
  analysis_id uuid references analyses(id) on delete cascade not null,
  team text not null check (team in ('home', 'away')),
  variant text not null check (variant in ('defensive', 'offensive')),
  start_x numeric not null,
  start_y numeric not null,
  end_x numeric not null,
  end_y numeric not null,
  color text not null,
  opacity numeric not null default 0.5,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table analysis_rectangles enable row level security;

-- Policies (same as analyses)
create policy "Users can view their own analysis rectangles"
  on analysis_rectangles for select
  using ( exists ( select 1 from analyses where id = analysis_rectangles.analysis_id and user_id = auth.uid() ) );

create policy "Users can insert their own analysis rectangles"
  on analysis_rectangles for insert
  with check ( exists ( select 1 from analyses where id = analysis_rectangles.analysis_id and user_id = auth.uid() ) );

create policy "Users can update their own analysis rectangles"
  on analysis_rectangles for update
  using ( exists ( select 1 from analyses where id = analysis_rectangles.analysis_id and user_id = auth.uid() ) );

create policy "Users can delete their own analysis rectangles"
  on analysis_rectangles for delete
  using ( exists ( select 1 from analyses where id = analysis_rectangles.analysis_id and user_id = auth.uid() ) );
