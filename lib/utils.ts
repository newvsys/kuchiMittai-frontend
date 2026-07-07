/**
 * Detect input type: email, phone number, or username
 * @param input - string to check
 * @returns 'email' | 'phone' | 'username'
 */
export const detectInputType = (input: string): 'email' | 'phone' | 'username' => {
  if (isValidEmailAddressFormat(input)) {
    return 'email';
  }
  if (isValidPhoneNumber(input)) {
    return 'phone';
  }
  if (isValidNameOrLastname(input)) {
    return 'username';
  }
  // Fallback: if not matching any, treat as username
  return 'username';
};

export const categoryMenuList = [
  {
    id: 1,
    title: "Cooking Oil",
    src: "/cookingOil.png",
    href: "/shop/cookingOil.png"
  },
  {
    id: 2,
    title: "Traditional Snacks",
    src: "/Traditional Snacks.png",
    href: "/shop/TraditionalSnacks"
  },
  {
    id: 3,
    title: "Natural Sweeteners",
    src: "/Natural Sweeteners.png",
    href: "/shop/Sweeteners"
  },
  {
    id: 4,
    title: "Pure Spices",
    src: "/Pure Spices.png",
    href: "/shop/Spices"
  },
  {
    id: 5,
    title: "Millets & Grains",
    src: "/Millets & Grains.png",
    href: "/shop/Millets"
  },
  
];

export const incentives = [
  {
    name: "Free Shipping",
    description:
      "Our shipping is completely free and that is completely good for our customers.",
    imageSrc: "/shipping icon.png",
  },
  {
    name: "24/7 Customer Support",
    description:
      "Our support is working all day and night to answer any question you have.",
    imageSrc: "/support icon.png",
  },
  {
    name: "Fast Shopping Cart",
    description:
      "We have super fast shopping experience and you will enjoy it.",
    imageSrc: "/fast shopping icon.png",
  },
];

export const navigation = {
  sale: [
    { name: "Discounts", href: "#" },
    { name: "News", href: "#" },
    { name: "Register Discounts", href: "#" },
  ],
  about: [
    
    { name: "Work With Us", href: "#" },
    { name: "Company Profile", href: "#" },
  ],
  buy: [
    
    { name: "Terms Of Use", href: "#" },
    { name: "Privacy Policy", href: "#" },
    { name: "Complaints", href: "#" },
    { name: "Partners", href: "#" },
  ],
  help: [
    { name: "Contact", href: "#" },
    { name: "How to Buy ", href: "#" },
    { name: "FAQ", href: "#" },
  ],
};

export const isValidNameOrLastname = (input: string) => {
  // Simple name or lastname regex format check
  const regex = /^[a-zA-Z\s]+$/;
  return regex.test(input);
};
/**
 * Validate phone number format (international and local)
 * Accepts numbers with optional +, spaces, dashes, and parentheses
 * Example valid: +1 234-567-8900, (123) 456-7890, 1234567890
 */
export const isValidPhoneNumber = (input: string) => {
  // Remove spaces, dashes, and parentheses
  const cleanedInput = input.replace(/[\s\-()]/g, "");
  // Regex: starts with optional +, followed by 10 to 15 digits
  const regex = /^\+?[0-9]{10,15}$/;
  return regex.test(cleanedInput);
};

export const isValidEmailAddressFormat = (input: string) => {
  // simple email address format check
  const regex = /^\S+@\S+\.\S+$/;
  return regex.test(input);
};

export const isValidCardNumber = (input: string) => {
  // Remove all non-digit characters
  const cleanedInput = input.replace(/[^0-9]/g, "");
  
  // Check if the cleaned input has valid length (13-19 digits)
  if (!/^\d{13,19}$/.test(cleanedInput)) {
    return false;
  }
  
  // Implement Luhn algorithm for credit card validation
  return luhnCheck(cleanedInput);
};

/**
 * Luhn algorithm implementation for credit card validation
 * @param cardNumber - The credit card number as a string
 * @returns boolean - true if the card number is valid according to Luhn algorithm
 */
const luhnCheck = (cardNumber: string): boolean => {
  let sum = 0;
  let isEven = false;
  
  // Process digits from right to left
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber[i], 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
};

/**
 * Enhanced credit card validation with card type detection
 * @param input - The credit card number as a string
 * @returns object with validation result and card type
 */
export const validateCreditCard = (input: string) => {
  const cleanedInput = input.replace(/[^0-9]/g, "");
  
  // Basic length and format check
  if (!/^\d{13,19}$/.test(cleanedInput)) {
    return {
      isValid: false,
      cardType: 'unknown',
      error: 'Invalid card number format'
    };
  }
  
  // Luhn algorithm check
  if (!luhnCheck(cleanedInput)) {
    return {
      isValid: false,
      cardType: 'unknown',
      error: 'Invalid card number (Luhn check failed)'
    };
  }
  
  // Detect card type based on BIN (Bank Identification Number)
  const cardType = detectCardType(cleanedInput);
  
  return {
    isValid: true,
    cardType,
    error: null
  };
};

/**
 * Detect credit card type based on BIN patterns
 * @param cardNumber - The credit card number as a string
 * @returns string - The detected card type
 */
const detectCardType = (cardNumber: string): string => {
  const firstDigit = cardNumber[0];
  const firstTwoDigits = cardNumber.substring(0, 2);
  const firstFourDigits = cardNumber.substring(0, 4);
  const firstThreeDigits = cardNumber.substring(0, 3);
  
  // Visa: starts with 4
  if (firstDigit === '4') {
    return 'visa';
  }
  
  // Mastercard: starts with 5 or 2
  if (firstDigit === '5' || (firstTwoDigits >= '22' && firstTwoDigits <= '27')) {
    return 'mastercard';
  }
  
  // American Express: starts with 34 or 37
  if (firstTwoDigits === '34' || firstTwoDigits === '37') {
    return 'amex';
  }
  
  // Discover: starts with 6011, 65, or 644-649
  if (firstFourDigits === '6011' || firstTwoDigits === '65' || 
      (firstThreeDigits >= '644' && firstThreeDigits <= '649')) {
    return 'discover';
  }
  
  // Diners Club: starts with 300-305, 36, or 38
  if ((firstThreeDigits >= '300' && firstThreeDigits <= '305') || 
      firstTwoDigits === '36' || firstTwoDigits === '38') {
    return 'diners';
  }
  
  // JCB: starts with 35
  if (firstTwoDigits === '35') {
    return 'jcb';
  }
  
  return 'unknown';
};

export const isValidCreditCardExpirationDate = (input: string) => {
  // simple expiration date format check
  const regex = /^(0[1-9]|1[0-2])\/?([0-9]{4}|[0-9]{2})$/;
  return regex.test(input);
};

export const isValidCreditCardCVVOrCVC = (input: string) => {
  // simple CVV or CVC format check
  const regex = /^[0-9]{3,4}$/;
  return regex.test(input);
};
