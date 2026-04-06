use std::any::{Any, TypeId};
use std::collections::HashMap;

/// A simple pub/sub event bus for decoupling game logic.
pub struct EventBus {
    subscribers: HashMap<TypeId, Vec<Box<dyn Fn(&dyn Any)>>>,
}

impl EventBus {
    pub fn new() -> Self {
        EventBus {
            subscribers: HashMap::new(),
        }
    }

    /// Subscribe to an event of type T.
    pub fn subscribe<T: 'static, F: Fn(&T) + 'static>(&mut self, handler: F) {
        let type_id = TypeId::of::<T>();
        let wrapper = move |any_event: &dyn Any| {
            if let Some(event) = any_event.downcast_ref::<T>() {
                handler(event);
            }
        };
        self.subscribers.entry(type_id).or_insert_with(Vec::new).push(Box::new(wrapper));
    }

    /// Publish an event. All subscribers to this type will be notified.
    pub fn publish<T: 'static>(&self, event: &T) {
        let type_id = TypeId::of::<T>();
        if let Some(handlers) = self.subscribers.get(&type_id) {
            for handler in handlers {
                handler(event as &dyn Any);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Mutex};

    struct TestEvent {
        message: String,
    }

    #[test]
    fn test_event_bus() {
        let mut bus = EventBus::new();
        let received = Arc::new(Mutex::new(String::new()));
        
        let received_clone = Arc::clone(&received);
        bus.subscribe(move |event: &TestEvent| {
            let mut r = received_clone.lock().unwrap();
            *r = event.message.clone();
        });

        bus.publish(&TestEvent { message: "Hello".to_string() });
        
        assert_eq!(*received.lock().unwrap(), "Hello");
    }
}
