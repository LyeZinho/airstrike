#[derive(Debug, Clone, PartialEq)]
pub enum AirportType {
    Large,
    Medium,
    Small,
    Other,
}

#[derive(Debug, Clone)]
pub struct Airport {
    pub icao: String,
    pub name: String,
    pub lat: f64,
    pub lon: f64,
    pub country_iso: String,
    pub airport_type: AirportType,
    pub elevation_ft: f32,
}

pub struct AirportDb {
    pub airports: Vec<Airport>,
}

fn split_csv_line(line: &str) -> Vec<String> {
    let mut fields = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;
    let mut chars = line.chars().peekable();
    while let Some(ch) = chars.next() {
        match ch {
            '"' => {
                if in_quotes {
                    if chars.peek() == Some(&'"') {
                        chars.next();
                        current.push('"');
                    } else {
                        in_quotes = false;
                    }
                } else {
                    in_quotes = true;
                }
            }
            ',' if !in_quotes => {
                fields.push(current.trim().to_string());
                current = String::new();
            }
            c => current.push(c),
        }
    }
    fields.push(current.trim().to_string());
    fields
}

impl AirportDb {
    pub fn load(csv_bytes: &[u8]) -> Self {
        let text = std::str::from_utf8(csv_bytes).unwrap_or("");
        let mut airports = Vec::new();
        let mut header_done = false;

        let mut idx_ident = 0usize;
        let mut idx_type = 1usize;
        let mut idx_name = 2usize;
        let mut idx_lat = 3usize;
        let mut idx_lon = 4usize;
        let mut idx_elev = 5usize;
        let mut idx_country = 6usize;

        for line in text.lines() {
            if !header_done {
                let cols = split_csv_line(line);
                for (i, col) in cols.iter().enumerate() {
                    match col.as_str() {
                        "ident" => idx_ident = i,
                        "type" => idx_type = i,
                        "name" => idx_name = i,
                        "latitude_deg" => idx_lat = i,
                        "longitude_deg" => idx_lon = i,
                        "elevation_ft" => idx_elev = i,
                        "iso_country" => idx_country = i,
                        _ => {}
                    }
                }
                header_done = true;
                continue;
            }
            let fields = split_csv_line(line);
            let get = |i: usize| -> String { fields.get(i).cloned().unwrap_or_default() };
            let airport_type = match get(idx_type).as_str() {
                "large_airport" => AirportType::Large,
                "medium_airport" => AirportType::Medium,
                "small_airport" => AirportType::Small,
                _ => continue,
            };
            let lat: f64 = get(idx_lat).parse().unwrap_or(0.0);
            let lon: f64 = get(idx_lon).parse().unwrap_or(0.0);
            let elevation_ft: f32 = get(idx_elev).parse().unwrap_or(0.0);
            airports.push(Airport {
                icao: get(idx_ident),
                name: get(idx_name),
                lat,
                lon,
                country_iso: get(idx_country),
                airport_type,
                elevation_ft,
            });
        }
        AirportDb { airports }
    }

    pub fn for_country<'a>(&'a self, iso: &str) -> Vec<&'a Airport> {
        self.airports
            .iter()
            .filter(|a| a.country_iso == iso)
            .collect()
    }

    pub fn countries(&self) -> Vec<(String, String)> {
        let mut seen = std::collections::HashSet::new();
        let mut result = Vec::new();
        for a in &self.airports {
            if seen.insert(a.country_iso.clone()) {
                result.push((a.country_iso.clone(), a.country_iso.clone()));
            }
        }
        result.sort_by(|a, b| a.0.cmp(&b.0));
        result
    }

    pub fn by_icao(&self, icao: &str) -> Option<&Airport> {
        self.airports.iter().find(|a| a.icao == icao)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE_CSV: &str = "\
ident,type,name,latitude_deg,longitude_deg,elevation_ft,iso_country
LPPT,large_airport,Humberto Delgado Airport,38.7813,-9.13592,374,PT
LPPR,large_airport,Francisco de Sa Carneiro Airport,41.2481,-8.68139,228,PT
LEMD,large_airport,Adolfo Suarez Madrid-Barajas Airport,40.4936,-3.56676,2000,ES
LFPG,large_airport,Charles de Gaulle Airport,49.0097,2.54792,392,FR
LPFR,medium_airport,Faro Airport,37.0144,-7.96591,24,PT
LPPD,small_airport,João Paulo II Airport,37.7412,-25.6979,259,PT
XXXX,heliport,Some Heliport,38.0,-9.0,100,PT
";

    #[test]
    fn test_load_parses_airports() {
        let db = AirportDb::load(SAMPLE_CSV.as_bytes());
        assert!(!db.airports.is_empty());
    }

    #[test]
    fn test_load_filters_heliports() {
        let db = AirportDb::load(SAMPLE_CSV.as_bytes());
        assert!(
            !db.airports.iter().any(|a| a.icao == "XXXX"),
            "heliports must be excluded"
        );
    }

    #[test]
    fn test_for_country_returns_correct_airports() {
        let db = AirportDb::load(SAMPLE_CSV.as_bytes());
        let pt = db.for_country("PT");
        assert_eq!(pt.len(), 4, "Portugal should have 4 non-heliport airports");
        assert!(pt.iter().all(|a| a.country_iso == "PT"));
    }

    #[test]
    fn test_countries_returns_unique_list() {
        let db = AirportDb::load(SAMPLE_CSV.as_bytes());
        let countries = db.countries();
        assert_eq!(countries.len(), 3);
        assert!(countries.iter().any(|(iso, _)| iso == "PT"));
        assert!(countries.iter().any(|(iso, _)| iso == "ES"));
        assert!(countries.iter().any(|(iso, _)| iso == "FR"));
    }

    #[test]
    fn test_by_icao_finds_airport() {
        let db = AirportDb::load(SAMPLE_CSV.as_bytes());
        let apt = db.by_icao("LPPT");
        assert!(apt.is_some());
        assert_eq!(apt.unwrap().name, "Humberto Delgado Airport");
    }

    #[test]
    fn test_by_icao_returns_none_for_missing() {
        let db = AirportDb::load(SAMPLE_CSV.as_bytes());
        assert!(db.by_icao("ZZZZ").is_none());
    }

    #[test]
    fn test_airport_type_parsed_correctly() {
        let db = AirportDb::load(SAMPLE_CSV.as_bytes());
        let lppt = db.by_icao("LPPT").unwrap();
        assert!(matches!(lppt.airport_type, AirportType::Large));
        let lpfr = db.by_icao("LPFR").unwrap();
        assert!(matches!(lpfr.airport_type, AirportType::Medium));
        let lppd = db.by_icao("LPPD").unwrap();
        assert!(matches!(lppd.airport_type, AirportType::Small));
    }

    #[test]
    fn test_lat_lon_parsed_correctly() {
        let db = AirportDb::load(SAMPLE_CSV.as_bytes());
        let lppt = db.by_icao("LPPT").unwrap();
        assert!((lppt.lat - 38.7813).abs() < 0.0001);
        assert!((lppt.lon - (-9.13592)).abs() < 0.0001);
    }

    #[test]
    fn test_quoted_name_with_comma_parsed_correctly() {
        let csv = "ident,type,name,latitude_deg,longitude_deg,elevation_ft,iso_country\n\
                   KXYZ,large_airport,\"Airport, Main\",38.0,-9.0,100,US\n";
        let db = AirportDb::load(csv.as_bytes());
        assert_eq!(db.airports.len(), 1);
        assert_eq!(db.airports[0].name, "Airport, Main");
    }

    #[test]
    fn test_real_ourairports_csv_parses_portugal() {
        let csv = include_bytes!("../../../stratosphere/assets/airports.csv");
        let db = AirportDb::load(csv);
        let pt = db.for_country("PT");
        assert!(!pt.is_empty(), "Portugal should have airports in real CSV");
        assert!(
            pt.iter().any(|a| a.icao == "LPPT"),
            "LPPT (Lisbon) should be present"
        );
    }
}
