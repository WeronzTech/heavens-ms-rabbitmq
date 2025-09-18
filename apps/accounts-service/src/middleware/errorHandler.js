const errorHandler = (err, req, res, next) => {
    console.error(err); // log the error for debugging
  
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";
  
    res.status(statusCode).json({
      success: false,
      message,
      errors: err.errors || [],
      data: null,
    });
  };
  
  export { errorHandler };
  