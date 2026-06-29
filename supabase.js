// supabase.js

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://huxdkjrvdkbsvjkobiro.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_B-W93QgzhTgYgpQJ4uiY3w_PaxLGH9c";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)