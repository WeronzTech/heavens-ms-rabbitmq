export const PROPERTY_PATTERN = {
  PROPERTY: {
    CREATE_PROPERTY: "create_property",
    UPDATE_PROPERTY: "update_property",
    DELETE_PROPERTY: "delete_property",
    GET_PROPERTY_BY_ID: "get_property_by_id",
    GET_ALL_HEAVENS_PROPERTIES: "get_all_heavens_property",
    GET_CLIENT_PROPERTIES: "get_client_properties",
  },
  ROOM: {
    CREATE_ROOM: "create_room",
    UPDATE_ROOM: "update_room",
    DELETE_ROOM: "delete_room",
    GET_ROOMS_BY_PROPERTYID: "get_rooms_by_propertyId",
    GET_ROOM_OCCUPANTS: "get_room_occupants",
    GET_AVAILABLE_ROOMS_BY_PROPERTY: "get_available_rooms_by_property",
    GET_ALL_HEAVENS_ROOMS: "get_all_heavens_rooms",
    CONFIRM_ASSIGNMENT: "confirm_assignment",
    REMOVE_ASSIGNMENT: "remove_assignment",
  },
  STAFF: {
    GET_ALL_STAFF : "get_all_staff",
    GET_STAFF_BY_ID: "get_staff_by_id",
    DELETE_STAFF: "delete_staff",
    STAFF_STATUS_CHANGE: "staff_status_change",
    GET_STAFF_BY_PROPERTYID:"get_staff_by_propertyId",


  }
};
