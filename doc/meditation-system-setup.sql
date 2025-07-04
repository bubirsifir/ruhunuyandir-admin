-- ===================================================
-- RUHUNU UYANDIR - MEDİTASYON SİSTEMİ KURULUMU
-- Created: Aralık 2024
-- Description: Meditasyon kütüphanesi için database tabloları
-- ===================================================

-- UUID extension'ını aktif et (eğer yoksa)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================================
-- 1. MEDİTASYON KATEGORİLERİ
-- ===================================================

CREATE TABLE IF NOT EXISTS meditation_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  name_turkish VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50), -- 'leaf', 'waves', 'moon', 'heart', 'cloud', 'star'
  color VARCHAR(7), -- hex renk kodu (#4CAF50)
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================================
-- 2. MEDİTASYON İÇERİKLERİ (Ana Tablo)
-- ===================================================

CREATE TABLE IF NOT EXISTS meditation_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Temel Bilgiler
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES meditation_categories(id) ON DELETE SET NULL,
  
  -- Ses Dosyası Bilgileri
  audio_url TEXT NOT NULL,
  audio_file_duration INTEGER NOT NULL, -- Ses dosyasının gerçek süresi (saniye)
  audio_size INTEGER, -- MB cinsinden
  
  -- 🔄 LOOP SİSTEMİ
  is_loop BOOLEAN DEFAULT false, -- TRUE = döngü sesi, FALSE = sabit meditasyon
  
  -- Loop Ayarları (sadece is_loop=true için)
  loop_start_time INTEGER DEFAULT 0, -- Loop başlangıç zamanı (saniye)
  loop_end_time INTEGER, -- Loop bitiş zamanı (saniye, NULL = dosya sonuna kadar)
  default_duration INTEGER DEFAULT 600, -- Varsayılan çalma süresi (10 dakika)
  available_durations INTEGER[] DEFAULT ARRAY[300, 600, 900, 1200, 1800, 3600], -- Seçilebilir süreler
  
  -- Sabit Meditasyon Ayarları (sadece is_loop=false için)
  meditation_duration INTEGER, -- Sabit meditasyon süresi (saniye)
  has_guidance BOOLEAN DEFAULT false, -- Rehberli meditasyon mu?
  guidance_language VARCHAR(10) DEFAULT 'tr', -- Rehberlik dili
  
  -- Kategori Bilgileri
  content_type VARCHAR(50) NOT NULL, -- 'meditation', 'nature_sound', 'ambient', 'binaural'
  difficulty_level VARCHAR(20) DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
  tags TEXT[], -- ['nefes', 'uyku', 'rahatlatıcı']
  instructor_name VARCHAR(100),
  
  -- Kullanıcı İstatistikleri
  total_plays INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0.0,
  review_count INTEGER DEFAULT 0,
  
  -- Meta Bilgiler
  is_premium BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Validasyon Constraint'leri
  CONSTRAINT valid_loop_times CHECK (
    (NOT is_loop) OR 
    (loop_start_time >= 0 AND (loop_end_time IS NULL OR loop_end_time > loop_start_time))
  ),
  CONSTRAINT valid_meditation_duration CHECK (
    (is_loop AND meditation_duration IS NULL) OR 
    (NOT is_loop AND meditation_duration > 0)
  ),
  CONSTRAINT valid_content_type CHECK (
    content_type IN ('meditation', 'nature_sound', 'ambient', 'binaural')
  ),
  CONSTRAINT valid_difficulty_level CHECK (
    difficulty_level IN ('beginner', 'intermediate', 'advanced')
  )
);

-- ===================================================
-- 3. KULLANICI MEDİTASYON OTURUMLARI
-- ===================================================

CREATE TABLE IF NOT EXISTS user_meditation_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  meditation_id UUID REFERENCES meditation_content(id) ON DELETE CASCADE,
  
  -- Oturum Bilgileri
  selected_duration INTEGER, -- Kullanıcının seçtiği süre (loop için)
  actual_duration INTEGER, -- Gerçek dinlenen süre (saniye)
  completed_percentage DECIMAL(5,2) DEFAULT 0.0,
  is_completed BOOLEAN DEFAULT false,
  
  -- Loop Oturum Bilgileri
  loop_count INTEGER DEFAULT 0, -- Kaç kez döngü tamamlandı
  session_type VARCHAR(20) DEFAULT 'standard', -- 'standard', 'timed', 'infinite'
  
  -- Kullanıcı Geribildirimi
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
  user_notes TEXT,
  
  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Validasyon
  CONSTRAINT valid_session_type CHECK (
    session_type IN ('standard', 'timed', 'infinite')
  )
);

-- ===================================================
-- 4. INDEXES (Performans için)
-- ===================================================

-- Kategori lookup
CREATE INDEX IF NOT EXISTS idx_meditation_categories_active ON meditation_categories(is_active, order_index);

-- Meditasyon content lookup
CREATE INDEX IF NOT EXISTS idx_meditation_content_category ON meditation_content(category_id);
CREATE INDEX IF NOT EXISTS idx_meditation_content_active ON meditation_content(is_active, order_index);
CREATE INDEX IF NOT EXISTS idx_meditation_content_type ON meditation_content(content_type);
CREATE INDEX IF NOT EXISTS idx_meditation_content_loop ON meditation_content(is_loop);
CREATE INDEX IF NOT EXISTS idx_meditation_content_difficulty ON meditation_content(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_meditation_content_premium ON meditation_content(is_premium);
CREATE INDEX IF NOT EXISTS idx_meditation_content_featured ON meditation_content(is_featured);

-- User sessions lookup
CREATE INDEX IF NOT EXISTS idx_user_meditation_sessions_user_id ON user_meditation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_meditation_sessions_meditation_id ON user_meditation_sessions(meditation_id);
CREATE INDEX IF NOT EXISTS idx_user_meditation_sessions_completed ON user_meditation_sessions(is_completed);
CREATE INDEX IF NOT EXISTS idx_user_meditation_sessions_date ON user_meditation_sessions(started_at);

-- Composite indexes
CREATE INDEX IF NOT EXISTS idx_meditation_content_category_active ON meditation_content(category_id, is_active, order_index);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_date ON user_meditation_sessions(user_id, started_at DESC);

-- ===================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ===================================================

-- Kategoriler - Herkes okuyabilir
ALTER TABLE meditation_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meditation_categories_read_all" ON meditation_categories
  FOR SELECT USING (true);

-- Meditasyon içerik - Herkes okuyabilir
ALTER TABLE meditation_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meditation_content_read_all" ON meditation_content
  FOR SELECT USING (true);

-- Kullanıcı oturumları - Sadece kendi verilerini görebilir
ALTER TABLE user_meditation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_meditation_sessions_read_own" ON user_meditation_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_meditation_sessions_insert_own" ON user_meditation_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_meditation_sessions_update_own" ON user_meditation_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_meditation_sessions_delete_own" ON user_meditation_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- ===================================================
-- 6. TRIGGER FUNCTIONS (Otomatik güncellemeler)
-- ===================================================

-- Updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_meditation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ları ekle
CREATE TRIGGER update_meditation_categories_updated_at
    BEFORE UPDATE ON meditation_categories
    FOR EACH ROW EXECUTE FUNCTION update_meditation_updated_at();

CREATE TRIGGER update_meditation_content_updated_at
    BEFORE UPDATE ON meditation_content
    FOR EACH ROW EXECUTE FUNCTION update_meditation_updated_at();

-- ===================================================
-- 7. ÖRNEK VERİ (Test için)
-- ===================================================

-- Kategoriler
INSERT INTO meditation_categories (name, name_turkish, description, icon, color, order_index) VALUES
('Breathing', 'Nefes Teknikleri', 'Nefes odaklı meditasyon teknikleri', 'leaf', '#4CAF50', 1),
('Nature Sounds', 'Doğa Sesleri', 'Doğa seslerinde huzurlu anlar', 'waves', '#2196F3', 2),
('Guided Meditation', 'Rehberli Meditasyon', 'Sesli rehberlik eşliğinde meditasyon', 'heart', '#E91E63', 3),
('Ambient Music', 'Ambient Müzik', 'Sakinleştirici ambient müzikler', 'cloud', '#9C27B0', 4),
('Sleep Meditation', 'Uyku Meditasyonu', 'Derin uyku için özel meditasyonlar', 'moon', '#3F51B5', 5)
ON CONFLICT DO NOTHING;

-- Örnek meditasyon içerikleri
INSERT INTO meditation_content (
  title, description, category_id, audio_url, audio_file_duration,
  is_loop, meditation_duration, has_guidance, content_type, difficulty_level, tags
) VALUES
-- Sabit meditasyon
(
  'Temel Nefes Meditasyonu',
  'Başlangıç seviyesi için 5 dakikalık rehberli nefes meditasyonu. Nefes alma tekniklerini öğrenin.',
  (SELECT id FROM meditation_categories WHERE name = 'Breathing'),
  'https://placeholder-audio-url/breathing-meditation-5min.mp3',
  300,
  false,
  300,
  true,
  'meditation',
  'beginner',
  ARRAY['nefes', 'başlangıç', 'rehberli']
)
ON CONFLICT DO NOTHING;

-- Loop sesi örneği
INSERT INTO meditation_content (
  title, description, category_id, audio_url, audio_file_duration,
  is_loop, loop_start_time, loop_end_time, default_duration, available_durations,
  content_type, difficulty_level, tags
) VALUES
(
  'Okyanus Dalgaları',
  'Rahatlatıcı okyanus dalgaları sesi. İstediğiniz süre kadar dinleyebilirsiniz.',
  (SELECT id FROM meditation_categories WHERE name = 'Nature Sounds'),
  'https://placeholder-audio-url/ocean-waves-60sec.mp3',
  60,
  true,
  5,
  55,
  600,
  ARRAY[300, 600, 900, 1200, 1800, 3600],
  'nature_sound',
  'beginner',
  ARRAY['doğa', 'okyanus', 'rahatlatıcı']
)
ON CONFLICT DO NOTHING;

-- ===================================================
-- 8. KONTROL VE DOĞRULAMA
-- ===================================================

-- Tabloların oluşturulduğunu kontrol et
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('meditation_categories', 'meditation_content', 'user_meditation_sessions')
ORDER BY table_name, ordinal_position;

-- Constraint'lerin çalıştığını test et
-- SELECT * FROM meditation_content WHERE is_loop = true;
-- SELECT * FROM meditation_categories WHERE is_active = true;

-- ===================================================
-- NOTLAR:
-- 1. Bu script'i Supabase SQL Editor'da çalıştırın
-- 2. Hataları kontrol edin ve düzeltin
-- 3. Test verilerini gerçek ses dosyaları ile değiştirin
-- 4. Production'da örnek verileri kaldırın
-- =================================================== 