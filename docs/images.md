# Illustrative images

News photos from EastWire's sources are not licensed for reuse here: the source matrix allows
no media from GDELT-discovered publishers, Global Voices (whose media may be licensed
differently from its text) or the direct headline feeds, and publisher images are never
scraped. Some lead and secondary stories instead carry an **illustrative image**: a
photograph of the city or institution the story is about, from Wikimedia Commons.

> This is a record of what each file's page said when it was read. It is not legal advice.

## Rules

- **Only files in [`config/images.yaml`](../config/images.yaml)**, each with its own Commons file
  page read on the date given. Nothing is fetched or chosen automatically.
- **Licenses:** CC0, public domain, CC BY 2.0–4.0 or CC BY-SA 2.0–4.0. Anything else (NC, ND,
  fair use, "all rights reserved", unclear) is rejected. `ImageCatalog` (Java) and
  `scripts/validate_config.py` refuse an entry with any other license or a missing rights field,
  and the frontend refuses to show an image without its creator, license and file page.
- **Rejected when uncertain:** a personality-rights, trademark or deletion notice on the file
  page, identifiable people as the subject, a photo that could be read as a specific news
  event, a detail that does not show the place, or a distorted (360°) panorama.
- **Labelled and credited:** every image shows "Illustrative image", the creator's credit (as
  they asked for it), the license linked to its deed, and a link to the file page.
- **Changes:** resized by Wikimedia's thumbnailer (500, 960 or 1920 px wide) and cropped to the
  layout's aspect ratio by CSS. No other edits. Share-alike licenses apply to the photo, which is
  shown unmodified apart from that; EastWire's pages are not adaptations of it.
- **Relevance:** a city image only when the story's main subject is that city and the headline
  or dateline names it; a topic image (e.g. Japan + geopolitics: the National Diet) only when the
  headline also contains one of its `headline_words`. Never for a story about a country we do
  not cover, never the same image twice on a page, at most the lead and two secondary stories.
  With no cleared match the story runs without a picture.
- **Hosting:** loaded from Wikimedia's image servers (`thumb.wikimedia.org`), named in the CSP
  and in the privacy note on Sources & method.

## Accepted (file pages read 2026-10-15)

| id | File | Creator | License | Credit shown | Caption | Illustrates |
|---|---|---|---|---|---|---|
| `new-delhi-india-gate` | [India Gate, New Delhi from West.jpg](https://commons.wikimedia.org/wiki/File:India_Gate%2C_New_Delhi_from_West.jpg) | Nikhilb239 | CC BY-SA 4.0 | Nikhilb239 | India Gate, New Delhi | [1273294, 1261481] |
| `mumbai-gateway` | [Panoramic view of Taj Palace Hotel and Taj Tower with the iconic Gateway of India in the background.jpg](https://commons.wikimedia.org/wiki/File:Panoramic_view_of_Taj_Palace_Hotel_and_Taj_Tower_with_the_iconic_Gateway_of_India_in_the_background.jpg) | iMahesh | CC BY-SA 4.0 | iMahesh | Mumbai waterfront | [1275339] |
| `bengaluru-vidhana-soudha` | [Vidhana Soudha LE.jpg](https://commons.wikimedia.org/wiki/File:Vidhana_Soudha_LE.jpg) | DeepanjanGhosh | CC BY-SA 4.0 | DeepanjanGhosh | Vidhana Soudha, Bengaluru | [1277333] |
| `kolkata-howrah-bridge` | [Howrah Bridge, Foggy.jpg](https://commons.wikimedia.org/wiki/File:Howrah_Bridge%2C_Foggy.jpg) | Dey.sandip | CC BY-SA 3.0 | Dey.sandip | Howrah Bridge, Kolkata | [1275004] |
| `chennai-ripon-building` | [Ripon Building panorama.jpg](https://commons.wikimedia.org/wiki/File:Ripon_Building_panorama.jpg) | PlaneMad | CC BY-SA 2.5 | CC-by-sa PlaneMad/Wikimedia | Ripon Building, Chennai | [1264527] |
| `hyderabad-char-kaman` | [Char Kaman 01.jpg](https://commons.wikimedia.org/wiki/File:Char_Kaman_01.jpg) | Bernard Gagnon | CC BY-SA 3.0 | Bernard Gagnon | Char Kaman, Hyderabad | [1269843] |
| `ahmedabad-houses` | [Houses in Ahmedabad.jpg](https://commons.wikimedia.org/wiki/File:Houses_in_Ahmedabad.jpg) | Bernard Gagnon | CC BY-SA 3.0 | Bernard Gagnon | Houses in Ahmedabad | [1279233] |
| `tokyo-marunouchi` | [Marunouchi Central Plaza with blue sky, Tokyo station and Shin-Marunouchi Building, panoramic view from JP Tower, Tokyo, Japan.jpg](https://commons.wikimedia.org/wiki/File:Marunouchi_Central_Plaza_with_blue_sky%2C_Tokyo_station_and_Shin-Marunouchi_Building%2C_panoramic_view_from_JP_Tower%2C_Tokyo%2C_Japan.jpg) | Basile Morin | CC BY-SA 4.0 | Basile Morin | Marunouchi and Tokyo Station | [1850147] |
| `osaka-dotonbori` | [Osaka Dotonbori Canal.jpg](https://commons.wikimedia.org/wiki/File:Osaka_Dotonbori_Canal.jpg) | 32linesky | CC BY-SA 4.0 | 32linesky | Dotonbori, Osaka | [1853909] |
| `seoul-gyedong-gil` | [Gyedong-gil street with climbing plants at golden hour in Seoul South Korea.jpg](https://commons.wikimedia.org/wiki/File:Gyedong-gil_street_with_climbing_plants_at_golden_hour_in_Seoul_South_Korea.jpg) | Basile Morin | CC BY-SA 4.0 | Basile Morin | Gyedong-gil, Seoul | [1835848] |
| `busan-gamcheon` | [Gamcheon Culture Village.jpg](https://commons.wikimedia.org/wiki/File:Gamcheon_Culture_Village.jpg) | Bernard Gagnon | CC0 | Bernard Gagnon | Gamcheon, Busan | [1838524] |
| `beijing-qianmen` | [201902 Qianmen Street in snow.jpg](https://commons.wikimedia.org/wiki/File:201902_Qianmen_Street_in_snow.jpg) | Zheng sun | CC BY-SA 4.0 | Zheng sun | Qianmen Street, Beijing | [1816670] |
| `shanghai-yu-garden` | [Yu Garden Shanghai November 2017 001.jpg](https://commons.wikimedia.org/wiki/File:Yu_Garden_Shanghai_November_2017_001.jpg) | King of Hearts | CC BY-SA 4.0 | King of Hearts | Yu Garden, Shanghai | [1796236] |
| `guangzhou-canton-tower` | [View of Canton Tower near Guangzhou Library.jpg](https://commons.wikimedia.org/wiki/File:View_of_Canton_Tower_near_Guangzhou_Library.jpg) | そらみみ | CC BY-SA 4.0 | そらみみ | Canton Tower, Guangzhou | [1809858] |
| `japan-diet` | [National Diet Building 20170209.jpg](https://commons.wikimedia.org/wiki/File:National_Diet_Building_20170209.jpg) | Suicasmo | CC BY-SA 4.0 | Suicasmo | National Diet Building, Tokyo | JP ['geopolitics'] |
| `japan-stock-exchange` | [Tokyo Stock Exchange Main Building (1988).jpg](https://commons.wikimedia.org/wiki/File:Tokyo_Stock_Exchange_Main_Building_%281988%29.jpg) | Kakidai | CC BY-SA 4.0 | Kakidai | Tokyo Stock Exchange | JP ['economy', 'business'] |
| `india-parliament` | [Sansad Bhavan, Delhi, BNK.jpg](https://commons.wikimedia.org/wiki/File:Sansad_Bhavan%2C_Delhi%2C_BNK.jpg) | Nikhilb239 | CC BY-SA 4.0 | Nikhilb239 | Parliament House, New Delhi | IN ['geopolitics'] |
| `india-stock-exchange` | [BSE - Bombay Stock Exchange Building.jpg](https://commons.wikimedia.org/wiki/File:BSE_-_Bombay_Stock_Exchange_Building.jpg) | Niyantha Shekhar | CC BY 2.0 | Niyantha Shekhar | Bombay Stock Exchange, Mumbai | IN ['economy', 'business'] |
| `korea-national-assembly` | [Republic of Korea capitol.jpg](https://commons.wikimedia.org/wiki/File:Republic_of_Korea_capitol.jpg) | Cjb8293 | CC BY-SA 4.0 | Cjb8293 | National Assembly, Seoul | KR ['geopolitics'] |
| `china-great-hall` | [Great Hall of the People (20200825114146).jpg](https://commons.wikimedia.org/wiki/File:Great_Hall_of_the_People_%2820200825114146%29.jpg) | N509FZ | CC BY-SA 4.0 | N509FZ | Great Hall of the People, Beijing | CN ['geopolitics'] |

Ripon Building: the author asks for the credit "CC-by-sa PlaneMad/Wikimedia" and a link to the
file page; that is the credit shown.

## Page and sector headers (frontend/src/lib/pageImages.ts)

Every page has a header photo, chosen from the files above plus two more whose pages were read
on 2026-10-15. Each is labelled ("Illustrative image" or "Historical map") and credited with
links to its file page and license.

| Page | File | Creator | License |
|---|---|---|---|
| Map | [1864 Mitchell Map of Asia](https://commons.wikimedia.org/wiki/File:1864_Mitchell_Map_of_Asia_-_Geographicus_-_Asia-mitchell-1864.jpg) | Samuel Augustus Mitchell (via Geographicus) | Public domain |
| Environment sector | [Mount Fuji at sunset, March 2025](https://commons.wikimedia.org/wiki/File:Mount_Fuji_at_sunset,_March_2025.jpg) | Romain Guy | CC0 (Featured picture) |
| Search | Yu Garden, Shanghai | King of Hearts | CC BY-SA 4.0 |
| Sectors | Gamcheon Culture Village, Busan | Bernard Gagnon | CC0 |
| Social | Char Kaman, Hyderabad | Bernard Gagnon | CC BY-SA 3.0 |
| Status | Howrah Bridge, foggy | Dey.sandip | CC BY-SA 3.0 |
| How it works | Qianmen Street in snow, Beijing | Zheng sun | CC BY-SA 4.0 |
| Economy sector | Bombay Stock Exchange | Niyantha Shekhar | CC BY 2.0 |
| Geopolitics sector | National Assembly, Seoul | Cjb8293 | CC BY-SA 4.0 |
| Technology sector | Marunouchi and Tokyo Station | Basile Morin | CC BY-SA 4.0 |
| Business sector | Tokyo Stock Exchange | Kakidai | CC BY-SA 4.0 |
| Society sector | Gyedong-gil, Seoul | Basile Morin | CC BY-SA 4.0 |

Story cards without a cleared photo use EastWire's own artwork (a country motif and a sector
icon, drawn in code, `StoryArt`), always labelled "Illustration".

## Rejected candidates (2026-10-15)

| File | Why |
|---|---|
| India Gate, New Delhi.jpg | A close detail of the inscription; does not show the place |
| Yanaka Ginza shopping street (4041690725).jpg | Identifiable people in the foreground |
| Dotonbori, Osaka - DSC05722.JPG | A close-up of an awning; does not show the place |
| Lianhuashan Park Shenzen China 1310769.jpg | People are the subject (in "Quality images of people") |
| Shenzhen Civic Center-20110101-RM-125000.jpg | Abstract view of a roof underside; not recognisable |
| The Entrance of Tokyo Stock Exchange Main Building 20240329.jpg | Shows only a ceiling |
| Great Hall of the People (20210619085952).jpg | Aerobatic smoke trails from a ceremony: could be read as an event photo |
| National Diet Building - Tokyo, Japan - DSC06736.JPG | Night skyline where the Diet is small; replaced by a daytime view |
| Beijing China Forbidden-City-03.jpg | A statue detail, not a view of Beijing |
| Pano-20230403-Gateway-of-India.jpg | A 360° equirectangular panorama: distorted when cropped |
| Parliament of India in New Delhi 05.jpg | Distant; replaced by a closer view |
| Datianshuijing Hutong (20210529190652).jpg | Shows a shopping-mall front (brand), not a street |
| Shanghai recycling transport tricycle.jpg | Marked with a personality-rights restriction |
| Any FAL-licensed photo (e.g. Qutub Minar in Delhi 03-2016.jpg) | Free Art License not on the accepted list |

## How to add an image

1. Find the file on Wikimedia Commons and read its file page: license template, author,
   requested credit, and any restriction, personality-rights or trademark notice.
2. Look at it: does it show the place or institution, without identifiable people as the
   subject, and could no one mistake it for a photo of a news event?
3. Add an entry to `config/images.yaml` with every field (creator, file page, license and URL,
   attribution as requested, permitted use, changes, alt text, caption, cities or country +
   sectors + headline_words) and `checked_on`.
4. Run `.venv/bin/python -I scripts/validate_config.py` and `./gradlew :core:test`.
5. Open a PR. A rejected candidate goes in the table above with the reason.
