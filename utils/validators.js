const { body, param, query } = require("express-validator")

class Validators {
  static email() {
    return body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address');
  }

  static password() {
    return body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number');
  }

  static objectId(field = 'id') {
    return param(field)
      .isMongoId()
      .withMessage(`Invalid ${field} format`);
  }

  static pagination() {
    return [
      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
    ];
  }

  static topicCustomizations() {
    return [
      body('customizations.level')
        .optional()
        .isIn(['beginner', 'intermediate', 'advanced'])
        .withMessage('Level must be one of the following: beginner, intermediate, advanced')
    ];
  }
}

module.exports = Validators
