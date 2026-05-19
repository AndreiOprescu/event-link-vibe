-- Refresh new-user seed palette: vibrant warm colors, no green
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  emojis text[] := array['🦊','🐼','🐯','🦉','🐙','🦁','🦄','🐸','🐢','🐧','🦋','🐺','🚀','🦊','🐳','🦅'];
  colors text[] := array['#F26A4F','#F4A36C','#F2C14E','#E55B7E','#7BAFD4','#5D7CBA','#C66B9E','#D9613C'];
begin
  insert into public.profiles (user_id, display_name, email, emoji, color)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email,
    emojis[1 + floor(random() * array_length(emojis, 1))::int],
    colors[1 + floor(random() * array_length(colors, 1))::int]
  );
  return new;
end;
$function$;

-- Reassign existing profile colors deterministically across the new palette
WITH palette AS (
  SELECT ARRAY['#F26A4F','#F4A36C','#F2C14E','#E55B7E','#7BAFD4','#5D7CBA','#C66B9E','#D9613C']::text[] AS c
),
ranked AS (
  SELECT id, row_number() OVER (ORDER BY id) AS rn FROM public.profiles
)
UPDATE public.profiles p
SET color = (SELECT c[1 + ((r.rn - 1) % array_length(c, 1))::int] FROM palette, ranked r WHERE r.id = p.id);

-- Switch default event color from green to coral and update existing greens
ALTER TABLE public.events ALTER COLUMN color SET DEFAULT '#F26A4F';
UPDATE public.events SET color = '#F26A4F' WHERE color = '#A3E635';