const generateOTP = () => {
  // return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
  return '123456';
};

module.exports = generateOTP;