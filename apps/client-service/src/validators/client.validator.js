import { body } from 'express-validator';

export const validateClientSignup = [
  body('companyName').notEmpty().withMessage('Company name is required'),
  body('primaryAdmin.name').notEmpty().withMessage('Admin name is required'),
  body('primaryAdmin.email').isEmail().withMessage('Valid email is required'),
  body('primaryAdmin.phone').notEmpty().withMessage('Phone number is required'),
  body('primaryAdmin.password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
];
