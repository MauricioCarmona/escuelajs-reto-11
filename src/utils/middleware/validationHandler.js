const boom = require('@hapi/boom');

 function validate(data, schema) {
   const { err } = schema.validate(data);
   return err;
 }

 function validationHandler(schema, check = 'body') {
   return function(req, res, next) {
     const err = validate(req[check], schema);

     err ? next(boom.badRequest(err)) : next();
   };
 }

 module.exports = validationHandler; 