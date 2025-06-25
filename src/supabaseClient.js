// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://riqqwernjyeieuoqqpzj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpcXF3ZXJuanllaWV1b3FxcHpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwMzI2NTEsImV4cCI6MjA2NTYwODY1MX0.-V5HzYk0-Z2ccmxzZq24uFVT9C_eQcj5dwOA6-xHVQQ';
export const supabase = createClient(supabaseUrl, supabaseKey);