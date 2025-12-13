const dummyOffers = [
  {
    id: 1,
    bankName: "HDFC Bank",
    cardType: "Classic Credit Card",
    featureBenefits: [
      "Cashback benefits",
      "5% Cashback on transactions made through PayZapp and SatyBuy Platforms",
      "2.5% Cashback on all other online spends",
      "Milestone Rewards"
    ],
    eligibilityAndDocuments: [
      "Minimum age: 21 years",
      "Minimum income: ₹3 lakhs per annum",
      "PAN Card mandatory",
      "Income proof (Salary slips/ITR)",
      "Address proof (Aadhaar/Passport/Utility bills)",
      "Bank statements for last 3 months"
    ]
  },
  {
    id: 2,
    bankName: "ICICI Bank",
    cardType: "Premium Card",
    featureBenefits: [
      "Welcome bonus points",
      "4X reward points on dining and entertainment",
      "2X reward points on grocery and fuel",
      "Complimentary airport lounge access",
      "Zero forex markup on international transactions"
    ],
    eligibilityAndDocuments: [
      "Minimum age: 23 years",
      "Minimum income: ₹5 lakhs per annum",
      "Good credit score (750+)",
      "PAN Card and Aadhaar Card",
      "Salary certificate or Form 16",
      "Bank statements for last 6 months"
    ]
  },
  {
    id: 3,
    bankName: "SBI Bank",
    cardType: "Gold Credit Card",
    featureBenefits: [
      "Annual fee waiver on spending ₹1 lakh",
      "10X reward points on online shopping",
      "1% fuel surcharge waiver",
      "Emergency card replacement worldwide",
      "Purchase protection insurance"
    ],
    eligibilityAndDocuments: [
      "Minimum age: 18 years",
      "Minimum income: ₹2.5 lakhs per annum",
      "Valid PAN Card",
      "Income documents (Salary slips/ITR)",
      "Identity and address proof",
      "Existing relationship with SBI preferred"
    ]
  },
  {
    id: 4,
    bankName: "Axis Bank",
    cardType: "Platinum Credit Card",
    featureBenefits: [
      "Unlimited cashback on all spends",
      "5% cashback on utility bill payments",
      "Movie ticket discounts up to ₹150",
      "Dining discounts at partner restaurants",
      "24/7 concierge services"
    ],
    eligibilityAndDocuments: [
      "Minimum age: 21 years",
      "Minimum income: ₹4 lakhs per annum",
      "CIBIL score above 700",
      "PAN Card and Aadhaar linking mandatory",
      "Latest salary slips (3 months)",
      "Bank account statements"
    ]
  },
  {
    id: 5,
    bankName: "Kotak Mahindra Bank",
    cardType: "Signature Credit Card",
    featureBenefits: [
      "Welcome gift vouchers worth ₹5000",
      "6X reward points on weekend dining",
      "Complimentary golf lessons",
      "Priority customer service",
      "Travel insurance coverage"
    ],
    eligibilityAndDocuments: [
      "Minimum age: 25 years",
      "Minimum income: ₹7 lakhs per annum",
      "Excellent credit history required",
      "PAN Card and valid ID proof",
      "Income tax returns for 2 years",
      "Property documents (if self-employed)"
    ]
  }
];

const getOffers = async (search = '') => {
  let offers = dummyOffers;
  
  if (search && search.trim()) {
    const searchTerm = search.trim().toLowerCase();
    offers = dummyOffers.filter(offer => 
      offer.bankName.toLowerCase().includes(searchTerm) ||
      offer.cardType.toLowerCase().includes(searchTerm) ||
      offer.featureBenefits.some(benefit => 
        benefit.toLowerCase().includes(searchTerm)
      )
    );
  }
  
  return offers;
};

module.exports = { getOffers };