use std::collections::{HashMap, HashSet};

/// Grid-based spatial indexing for fast O(1) proximity detection.
/// Divides the game world into cells; each cell tracks entity IDs within it.
pub struct SpatialIndex {
    cell_size: f64,
    cells: HashMap<(i32, i32), HashSet<u32>>,
    entity_to_cells: HashMap<u32, HashSet<(i32, i32)>>,
}

impl SpatialIndex {
    pub fn new(cell_size: f64) -> Self {
        SpatialIndex {
            cell_size,
            cells: HashMap::new(),
            entity_to_cells: HashMap::new(),
        }
    }

    /// Update entity position and footprint in the spatial index.
    /// `radius_km` defines how many cells the entity occupies (e.g. for radar range).
    pub fn update_entity(&mut self, id: u32, lat: f64, lon: f64, radius_km: f64) {
        // Approximate conversion: 1 degree latitude ≈ 111km.
        // For longitude, it depends on latitude, but for a local grid, 111km is a good baseline.
        let x = lon * 111.0;
        let y = lat * 111.0;
        
        let cell_x = (x / self.cell_size).floor() as i32;
        let cell_y = (y / self.cell_size).floor() as i32;
        let radius_cells = (radius_km / self.cell_size).ceil() as i32;

        let mut new_cells = HashSet::new();
        for dx in -radius_cells..=radius_cells {
            for dy in -radius_cells..=radius_cells {
                new_cells.insert((cell_x + dx, cell_y + dy));
            }
        }

        // Remove from old cells that are no longer occupied
        if let Some(old_cells) = self.entity_to_cells.get(&id) {
            for cell_key in old_cells {
                if !new_cells.contains(cell_key) {
                    if let Some(cell) = self.cells.get_mut(cell_key) {
                        cell.remove(&id);
                    }
                }
            }
        }

        // Add to new cells
        for cell_key in &new_cells {
            self.cells.entry(*cell_key).or_insert_with(HashSet::new).insert(id);
        }

        self.entity_to_cells.insert(id, new_cells);
    }

    /// Remove entity from the index (e.g. when destroyed).
    pub fn remove_entity(&mut self, id: u32) {
        if let Some(cells) = self.entity_to_cells.remove(&id) {
            for cell_key in cells {
                if let Some(cell) = self.cells.get_mut(&cell_key) {
                    cell.remove(&id);
                }
            }
        }
    }

    /// Get all entity IDs within range of a point.
    pub fn get_nearby(&self, lat: f64, lon: f64, search_radius_km: f64) -> Vec<u32> {
        let x = lon * 111.0;
        let y = lat * 111.0;
        let cell_x = (x / self.cell_size).floor() as i32;
        let cell_y = (y / self.cell_size).floor() as i32;
        let radius_cells = (search_radius_km / self.cell_size).ceil() as i32;

        let mut result = HashSet::new();
        for dx in -radius_cells..=radius_cells {
            for dy in -radius_cells..=radius_cells {
                if let Some(cell) = self.cells.get(&(cell_x + dx, cell_y + dy)) {
                    for &id in cell {
                        result.insert(id);
                    }
                }
            }
        }
        result.into_iter().collect()
    }

    /// Clear the index.
    pub fn clear(&mut self) {
        self.cells.clear();
        self.entity_to_cells.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_spatial_index_basic() {
        let mut index = SpatialIndex::new(10.0); // 10km cells
        index.update_entity(1, 40.0, -9.0, 0.0);
        
        let nearby = index.get_nearby(40.0, -9.0, 5.0);
        assert!(nearby.contains(&1));

        index.update_entity(1, 50.0, -9.0, 0.0);
        let nearby_old = index.get_nearby(40.0, -9.0, 5.0);
        assert!(!nearby_old.contains(&1));
        
        let nearby_new = index.get_nearby(50.0, -9.0, 5.0);
        assert!(nearby_new.contains(&1));
    }
}
