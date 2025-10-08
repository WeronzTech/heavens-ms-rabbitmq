import { createResponder } from "../../../../libs/common/rabbitMq.js";
import { PROPERTY_PATTERN } from "../../../../libs/patterns/property/property.pattern.js";
import { addCarouselImages, deleteCarousel, getAllCarousel, updateCarouselImages } from "../services/carousel.service.js";

createResponder(PROPERTY_PATTERN.CAROUSEL.ADD_CAROUSEL, async (data) => {
    return await addCarouselImages(data);
  });

createResponder(PROPERTY_PATTERN.CAROUSEL.UPDATE_CAROUSEL, async (data) => {
    return await updateCarouselImages(data);
  });  

createResponder(PROPERTY_PATTERN.CAROUSEL.DELETE_CAROUSEL, async (data) => {
    return await deleteCarousel(data);
  }); 
  
  createResponder(PROPERTY_PATTERN.CAROUSEL.GET_ALL_CAROUSEL, async (data) => {
    return await getAllCarousel(data);
  }); 