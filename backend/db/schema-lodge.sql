-- Расширение БД Ордена XLIX: разделы цифровой ложи.
-- Идемпотентно: таблицы создаются при отсутствии, сид перезаписывается.

CREATE TABLE IF NOT EXISTS symbols (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL, latin TEXT, meaning TEXT, glyph TEXT, sort INT NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS degrees (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL, latin TEXT, rights TEXT, duties TEXT, sort INT NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS officers (
  id SERIAL PRIMARY KEY,
  role TEXT NOT NULL, latin TEXT, holder TEXT, duty TEXT, sort INT NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS chronicle (
  id SERIAL PRIMARY KEY,
  year TEXT NOT NULL, title TEXT NOT NULL, text TEXT, sort INT NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS rituals (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL, latin TEXT, description TEXT, sort INT NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS regalia (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL, latin TEXT, description TEXT, sort INT NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS archive (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL, kind TEXT, min_degree TEXT, note TEXT, sort INT NOT NULL DEFAULT 0
);

TRUNCATE symbols, degrees, officers, chronicle, rituals, regalia, archive RESTART IDENTITY;

INSERT INTO symbols (name, latin, meaning, glyph, sort) VALUES
('Наугольник и циркуль','Norma et Circinus','Наугольник учит выверять поступки, циркуль — держать страсти в пределах. Вместе они очерчивают границу дозволенного.','square-compass',1),
('Всевидящее око','Oculus Providentiae','Лучезарная дельта с оком напоминает: за каждым делом брата наблюдает Великий Строитель.','eye',2),
('Колонны Иахин и Боаз','Jachin et Boaz','Две колонны у входа в храм — утверждение и сила. Между ними проходит посвящаемый.','columns',3),
('Ветвь акации','Acacia','Вечнозелёная акация — знак бессмертия души и памяти о павшем мастере.','acacia',4),
('Отвес и уровень','Perpendiculum et Libella','Отвес испытывает прямоту, уровень — равенство братьев. Никто не выше другого.','plumb',5),
('Мозаичный пол','Pavimentum','Чёрные и белые плиты — свет и тьма, радость и скорбь, из которых соткана жизнь.','mosaic',6),
('Мастерок','Trulla','Мастерок скрепляет камни известью братской любви в единое здание.','trowel',7),
('Песочные часы','Clepsydra','Песок утекает беззвучно: время мастера ограничено, труд его — нет.','hourglass',8);

INSERT INTO degrees (name, latin, rights, duties, sort) VALUES
('Ученик','Discipulus','Присутствие на открытых работах','Молчание и труд над грубым камнем',1),
('Подмастерье','Socius','Изучение семи свободных искусств','Обтёсывать камень, служить старшим',2),
('Мастер','Magister','Владеет словом и резцом; может передать знак','Хранить тайну, обучать младших',3),
('Второй круг','Circulus Secundus','Допуск к хроникам Ордена','Беречь Архив от посторонних глаз',4),
('Внутренний круг','Circulus Interior','Присутствие при передаче знака','Свидетельствовать без записи',5),
('Хранители','Custodes','Совет семи; решают судьбу спорных жетонов','Хранить Архив XLIX и линии домов',6);

INSERT INTO officers (role, latin, holder, duty, sort) VALUES
('Досточтимый Мастер','Magister Venerabilis','№ XLIX-01','Руководит капитулом и открывает работы',1),
('Первый Надзиратель','Vigil Primus','№ XLIX-07','Следит за подмастерьями, замыкает столбы',2),
('Второй Надзиратель','Vigil Secundus','№ XLIX-12','Наставляет учеников, отмеряет время работ',3),
('Оратор','Orator','№ XLIX-03','Хранит устав и произносит поучения',4),
('Секретарь','Secretarius','не назван','Ведёт зодческие работы (протоколы)',5),
('Казначей','Thesaurarius','№ XLIX-05','Хранит кружку милосердия',6),
('Обрядоначальник','Magister Caeremoniarum','№ XLIX-09','Ведёт посвящаемого по храму',7),
('Страж-привратник','Custos Portae','не назван','Стоит у дверей с обнажённым мечом',8);

INSERT INTO chronicle (year, title, text, sort) VALUES
('1305','Дом Джотто','Вырезан первый жетон, несущий обе сорок девятки. Начало Ордена.',1),
('1420','Дом Брунеллески','Построен первый тайный капитул; чертежи скрыты в куполе.',2),
('1466','Дом Донателло','Отлиты бронзовые знаки Совета семи.',3),
('1508','Дом Рафаэль','Учреждена тайная переписка между домами-хранителями.',4),
('1512','Дом Микеланджело','Установлен канон пропорций жетона «49».',5),
('1749','Дом Бернини','Леонардо да Винчи основывает Дом Бернини; Архив XLIX обретает хранителя.',6),
('MMXXVI','Портал Ордена','Цифровой капитул открыт для предъявляющих знак.',7);

INSERT INTO rituals (name, latin, description, sort) VALUES
('Приём в Орден','Receptio','Знак оставляется незаметно; слово доверия передаётся из уст в уста, без свидетелей.',1),
('Передача знака','Traditio Signi','Закрытая церемония; присутствие исключительно по жетону.',2),
('Совет семи','Consilium Septem','Семь хранителей решают судьбу спорного или возвращённого жетона.',3),
('Годовой цикл','Annus','Семь на семь: сорок девятое собрание года никогда не объявляется.',4),
('Молчание','Silentium','О сказанном в капитуле не говорят за его пределами.',5);

INSERT INTO regalia (name, latin, description, sort) VALUES
('Жетон «49»','Signum','Орех, ручная резьба, обе сорок девятки. Предъявляется вместо имени.',1),
('Запон второго круга','Praecinctorium','Кожаный фартук с тиснёной лучезарной дельтой.',2),
('Знак Хранителя','Insigne Custodis','Бронзовая дельта на муаровой ленте.',3),
('Перчатки','Chirothecae','Белые перчатки — знак чистоты помыслов и рук.',4),
('Печать капитула','Sigillum','Сургучный оттиск «XLIX»; ставится лишь на решения Совета семи.',5);

INSERT INTO archive (title, kind, min_degree, note, sort) VALUES
('Хроники 1749–1812','Рукопись','Второй круг','Чтение дозволено на Малом капитуле.',1),
('Патент Дома Бернини','Патент','Хранители','Хранится в Архиве XLIX; копии запрещены.',2),
('Толкование обеих сорок девяток','Трактат','Внутренний круг','Передаётся с пояснением наставника.',3),
('Список утраченных жетонов','Реестр','Хранители','Ведётся Домом Боттичелли.',4),
('Устная Книга Мори','Предание','—','Не подлежит записи; хранится в памяти Дома Мори.',5);
