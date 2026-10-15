/**
 * Page and sector header images. Each is a Wikimedia Commons file whose own page was read
 * (see docs/images.md and config/images.yaml for the full record: creator, license, changes).
 * They illustrate a place or a subject; none is a photo of a news event, and each is labelled.
 * Generated from config/images.yaml plus two files added for headers (map, environment).
 */
export interface PageImage {
  id: string
  file: string
  filePage: string
  /** Wikimedia thumbnail URL with {width}: 500, 960 or 1920. */
  url: string
  creator: string
  license: string
  licenseUrl: string
  credit: string
  alt: string
  caption: string
  position: string
}

export const PAGE_IMAGES: Record<string, PageImage> = {
  'map': {
      "id": "asia-map-1864",
      "file": "1864 Mitchell Map of Asia - Geographicus - Asia-mitchell-1864.jpg",
      "filePage": "https://commons.wikimedia.org/wiki/File:1864_Mitchell_Map_of_Asia_-_Geographicus_-_Asia-mitchell-1864.jpg",
      "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9b/1864_Mitchell_Map_of_Asia_-_Geographicus_-_Asia-mitchell-1864.jpg/{width}px-1864_Mitchell_Map_of_Asia_-_Geographicus_-_Asia-mitchell-1864.jpg",
      "creator": "Samuel Augustus Mitchell",
      "license": "Public domain",
      "licenseUrl": "",
      "credit": "Samuel Augustus Mitchell (1864), via Geographicus",
      "alt": "An 1864 engraved map of Asia, with China, India, Japan and Korea coloured by region",
      "caption": "Mitchell’s map of Asia, 1864",
      "position": "62% 45%"
  },
  'search': {
      "id": "shanghai-yu-garden",
      "file": "Yu Garden Shanghai November 2017 001.jpg",
      "filePage": "https://commons.wikimedia.org/wiki/File:Yu_Garden_Shanghai_November_2017_001.jpg",
      "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/37/Yu_Garden_Shanghai_November_2017_001.jpg/{width}px-Yu_Garden_Shanghai_November_2017_001.jpg",
      "creator": "King of Hearts",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "credit": "King of Hearts",
      "alt": "The Huxinting teahouse on its pond in Yu Garden, Shanghai",
      "caption": "Yu Garden, Shanghai",
      "position": "50% 50%"
  },
  'sectors': {
      "id": "busan-gamcheon",
      "file": "Gamcheon Culture Village.jpg",
      "filePage": "https://commons.wikimedia.org/wiki/File:Gamcheon_Culture_Village.jpg",
      "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1e/Gamcheon_Culture_Village.jpg/{width}px-Gamcheon_Culture_Village.jpg",
      "creator": "Bernard Gagnon",
      "license": "CC0",
      "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
      "credit": "Bernard Gagnon",
      "alt": "Brightly painted houses stacked on a hillside in Gamcheon, Busan",
      "caption": "Gamcheon, Busan",
      "position": "50% 50%"
  },
  'social': {
      "id": "hyderabad-char-kaman",
      "file": "Char Kaman 01.jpg",
      "filePage": "https://commons.wikimedia.org/wiki/File:Char_Kaman_01.jpg",
      "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Char_Kaman_01.jpg/{width}px-Char_Kaman_01.jpg",
      "creator": "Bernard Gagnon",
      "license": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "credit": "Bernard Gagnon",
      "alt": "Traffic passing under one of the Char Kaman arches in the old city of Hyderabad",
      "caption": "Char Kaman, Hyderabad",
      "position": "50% 50%"
  },
  'status': {
      "id": "kolkata-howrah-bridge",
      "file": "Howrah Bridge, Foggy.jpg",
      "filePage": "https://commons.wikimedia.org/wiki/File:Howrah_Bridge%2C_Foggy.jpg",
      "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/42/Howrah_Bridge%2C_Foggy.jpg/{width}px-Howrah_Bridge%2C_Foggy.jpg",
      "creator": "Dey.sandip",
      "license": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "credit": "Dey.sandip",
      "alt": "The steel Howrah Bridge over the Hooghly River in Kolkata on a foggy morning",
      "caption": "Howrah Bridge, Kolkata",
      "position": "50% 40%"
  },
  'about': {
      "id": "beijing-qianmen",
      "file": "201902 Qianmen Street in snow.jpg",
      "filePage": "https://commons.wikimedia.org/wiki/File:201902_Qianmen_Street_in_snow.jpg",
      "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/08/201902_Qianmen_Street_in_snow.jpg/{width}px-201902_Qianmen_Street_in_snow.jpg",
      "creator": "Zheng sun",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "credit": "Zheng sun",
      "alt": "Qianmen gate at the end of a snowy pedestrian street in Beijing",
      "caption": "Qianmen Street, Beijing",
      "position": "50% 45%"
  },
  'sector-economy': {
      "id": "india-stock-exchange",
      "file": "BSE - Bombay Stock Exchange Building.jpg",
      "filePage": "https://commons.wikimedia.org/wiki/File:BSE_-_Bombay_Stock_Exchange_Building.jpg",
      "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/04/BSE_-_Bombay_Stock_Exchange_Building.jpg/{width}px-BSE_-_Bombay_Stock_Exchange_Building.jpg",
      "creator": "Niyantha Shekhar",
      "license": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "credit": "Niyantha Shekhar",
      "alt": "The Bombay Stock Exchange tower on Dalal Street, Mumbai",
      "caption": "Bombay Stock Exchange, Mumbai",
      "position": "50% 35%"
  },
  'sector-geopolitics': {
      "id": "korea-national-assembly",
      "file": "Republic of Korea capitol.jpg",
      "filePage": "https://commons.wikimedia.org/wiki/File:Republic_of_Korea_capitol.jpg",
      "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/Republic_of_Korea_capitol.jpg/{width}px-Republic_of_Korea_capitol.jpg",
      "creator": "Cjb8293",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "credit": "Cjb8293",
      "alt": "The domed National Assembly building of South Korea in Seoul",
      "caption": "National Assembly, Seoul",
      "position": "50% 50%"
  },
  'sector-technology': {
      "id": "tokyo-marunouchi",
      "file": "Marunouchi Central Plaza with blue sky, Tokyo station and Shin-Marunouchi Building, panoramic view from JP Tower, Tokyo, Japan.jpg",
      "filePage": "https://commons.wikimedia.org/wiki/File:Marunouchi_Central_Plaza_with_blue_sky%2C_Tokyo_station_and_Shin-Marunouchi_Building%2C_panoramic_view_from_JP_Tower%2C_Tokyo%2C_Japan.jpg",
      "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/23/Marunouchi_Central_Plaza_with_blue_sky%2C_Tokyo_station_and_Shin-Marunouchi_Building%2C_panoramic_view_from_JP_Tower%2C_Tokyo%2C_Japan.jpg/{width}px-Marunouchi_Central_Plaza_with_blue_sky%2C_Tokyo_station_and_Shin-Marunouchi_Building%2C_panoramic_view_from_JP_Tower%2C_Tokyo%2C_Japan.jpg",
      "creator": "Basile Morin",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "credit": "Basile Morin",
      "alt": "Tokyo Station’s red-brick building and the Marunouchi office towers seen from above",
      "caption": "Marunouchi and Tokyo Station",
      "position": "50% 55%"
  },
  'sector-business': {
      "id": "japan-stock-exchange",
      "file": "Tokyo Stock Exchange Main Building (1988).jpg",
      "filePage": "https://commons.wikimedia.org/wiki/File:Tokyo_Stock_Exchange_Main_Building_%281988%29.jpg",
      "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/37/Tokyo_Stock_Exchange_Main_Building_%281988%29.jpg/{width}px-Tokyo_Stock_Exchange_Main_Building_%281988%29.jpg",
      "creator": "Kakidai",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "credit": "Kakidai",
      "alt": "The Tokyo Stock Exchange building in Nihonbashi Kabutocho",
      "caption": "Tokyo Stock Exchange",
      "position": "50% 45%"
  },
  'sector-society': {
      "id": "seoul-gyedong-gil",
      "file": "Gyedong-gil street with climbing plants at golden hour in Seoul South Korea.jpg",
      "filePage": "https://commons.wikimedia.org/wiki/File:Gyedong-gil_street_with_climbing_plants_at_golden_hour_in_Seoul_South_Korea.jpg",
      "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/23/Gyedong-gil_street_with_climbing_plants_at_golden_hour_in_Seoul_South_Korea.jpg/{width}px-Gyedong-gil_street_with_climbing_plants_at_golden_hour_in_Seoul_South_Korea.jpg",
      "creator": "Basile Morin",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "credit": "Basile Morin",
      "alt": "A quiet street of low buildings and a vine-covered facade in Bukchon, Seoul",
      "caption": "Gyedong-gil, Seoul",
      "position": "50% 55%"
  },
  'sector-environment': {
      "id": "mount-fuji",
      "file": "Mount Fuji at sunset, March 2025.jpg",
      "filePage": "https://commons.wikimedia.org/wiki/File:Mount_Fuji_at_sunset%2C_March_2025.jpg",
      "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/66/Mount_Fuji_at_sunset%2C_March_2025.jpg/{width}px-Mount_Fuji_at_sunset%2C_March_2025.jpg",
      "creator": "Romain Guy",
      "license": "CC0",
      "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
      "credit": "Romain Guy",
      "alt": "Mount Fuji under snow at sunset, above dark foothills",
      "caption": "Mount Fuji at sunset",
      "position": "50% 40%"
  },
}

/** The Commons files the home page's sector tiles use, so the stories there do not repeat them. */
export const SECTOR_TILE_IMAGES = Object.entries(PAGE_IMAGES)
  .filter(([key]) => key.startsWith('sector-'))
  .map(([, image]) => image.id)
