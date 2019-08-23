class HttpError extends Error {
  statusCode:number;
  date:Date;
  constructor(message = 'Error', statusCode = 500) {
    super(message);
    if(Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpError);
    }
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.date = new Date();
  }
}

export default HttpError