const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('./src/config/database');
const City = require('./src/models/City.model');

connectDB();

// Major Indian metro cities (isMetro: true)
const metroCities = new Set([
  'Mumbai', 'Delhi', 'Bangalore', 'Kolkata', 'Chennai', 'Hyderabad',
  'Ahmedabad', 'Pune', 'Surat', 'Jaipur', 'Lucknow', 'Kanpur',
  'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Patna',
  'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad',
  'Meerut', 'Varanasi', 'Prayagraj', 'Ranchi', 'Coimbatore', 'Madurai',
  'Kochi', 'Chandigarh', 'Gurugram', 'Noida', 'Navi Mumbai',
]);

const cities = [
  "Jaipur","Lucknow","Kanpur","Nagpur","Indore","Thane","Bhopal","Visakhapatnam",
  "Patna","Vadodara","Ghaziabad","Ludhiana","Agra","Nashik","Faridabad","Meerut",
  "Kalyan-Dombivli","Vasai-Virar","Varanasi","Srinagar","Aurangabad","Dhanbad",
  "Amritsar","Navi Mumbai","Prayagraj","Ranchi","Howrah","Coimbatore","Jabalpur",
  "Gwalior","Vijayawada","Jodhpur","Madurai","Raipur","Kota","Guwahati",
  "Chandigarh","Solapur","Hubballi-Dharwad","Bareilly","Moradabad","Mysuru",
  "Gurugram","Aligarh","Jalandhar","Tiruchirappalli","Bhubaneswar","Salem",
  "Warangal","Mira-Bhayandar","Thiruvananthapuram","Bhiwandi","Saharanpur",
  "Guntur","Amravati","Bikaner","Noida","Jamshedpur","Bhilai","Cuttack",
  "Firozabad","Kochi","Nellore","Bhavnagar","Dehradun","Durgapur","Asansol",
  "Rourkela","Nanded","Kolhapur","Ajmer","Akola","Kalaburagi","Jamnagar",
  "Ujjain","Loni","Siliguri","Jhansi","Ulhasnagar","Jammu","Sangli-Miraj",
  "Mangaluru","Erode","Belagavi","Ambattur","Tirunelveli","Malegaon","Gaya",
  "Jalgaon","Udaipur","Maheshtala","Davanagere","Kozhikode","Kurnool",
  "Rajpur Sonarpur","Rajahmundry","Bokaro","South Dumdum","Ballari","Patiala",
  "Gopalpur","Agartala","Bhagalpur","Muzaffarnagar","Bhatpara","Panihati",
  "Latur","Dhule","Rohtak","Korba","Bhilwara","Brahmapur","Muzaffarpur",
  "Ahmednagar","Mathura","Kollam","Avadi","Kadapa","Kamarhati","Bilaspur",
  "Shahjahanpur","Satara","Vijayapura","Rampur","Shivamogga","Chandrapur",
  "Junagadh","Thrissur","Alwar","Bardhaman","Kulti","Kakinada","Nizamabad",
  "Parbhani","Tumakuru","Khammam","Ozhukarai","Bihar Sharif","Panipat",
  "Darbhanga","Bally","Aizawl","Dewas","Ichalkaranji","Karnal","Bathinda",
  "Jalna","Eluru","Barasat","Kirari Suleman Nagar","Purnia","Satna","Mau",
  "Sonipat","Farrukhabad","Sagar","Durg","Imphal","Ratlam","Hapur","Arrah",
  "Anantapur","Karimnagar","Etawah","Ambarnath","North Dumdum","Bharatpur",
  "Begusarai","Gandhidham","Thoothukudi","Puducherry","Kharagpur","Abohar",
  "Hosur","Chittoor","Adoni","Amroha","Sambalpur","Rewa","Bulandshahr",
  "Nadiad","Yamunanagar","Karawal Nagar","Tenali","Sri Ganganagar",
  "Vizianagaram","Karaikudi","Pathankot","Haldwani","Nagercoil","Haridwar",
  "Pali","Morena","Bharuch","Bhind","Raichur","Anand","Hindupur","Munger",
  "Bongaigaon","Hazaribagh","Sasaram","Hajipur","Shimla","Dimapur","Shillong",
  "Silchar","Tezpur","Dibrugarh","Tinsukia","Itanagar","Gangtok","Kohima",
  "Port Blair","Panaji","Margao","Vellore","Namakkal","Karur","Kanchipuram",
  "Cuddalore","Dindigul","Thanjavur","Nagapattinam","Villupuram","Sivakasi",
  "Virudhunagar","Pollachi","Kumbakonam","Tiruppur","Ranipet","Palakkad",
  "Kannur","Alappuzha","Kottayam","Malappuram","Kasaragod","Pathanamthitta",
  "Manjeri","Udupi","Manipal","Karwar","Bidar","Hassan","Mandya",
  "Chikkamagaluru","Bagalkot","Yadgir","Hosapete","Raebareli","Sitapur",
  "Faizabad","Ayodhya","Unnao","Basti","Gorakhpur","Deoria","Jaunpur",
  "Mirzapur","Ballia","Azamgarh","Sultanpur","Bahraich","Fatehpur","Orai",
  "Mainpuri","Etah","Hardoi","Pilibhit","Budaun","Shamli","Modinagar",
  "Sambhal","Amethi","Noorpur","Sikar","Sawai Madhopur","Churu","Jhunjhunu",
  "Barmer","Jaisalmer","Sirohi","Dungarpur","Banswara","Hanumangarh",
  "Kishangarh","Tonk","Beawar","Hoshiarpur","Mohali","Batala","Moga",
  "Phagwara","Barnala","Kapurthala","Malerkotla","Sangrur","Fazilka","Sirsa",
  "Ambala","Kurukshetra","Hisar","Rewari","Kaithal","Jhajjar","Palwal",
  "Narnaul","Bhiwani","Jind","Bhuj","Gandhinagar","Surendranagar","Mehsana",
  "Palanpur","Porbandar","Ankleshwar","Valsad","Navsari","Morbi","Godhra",
  "Veraval","Vapi","Katni","Singrauli","Chhindwara","Seoni","Vidisha",
  "Neemuch","Mandsaur","Shivpuri","Datia","Burhanpur","Khandwa","Betul",
  "Guna","Pithampur","Jagdalpur","Rajnandgaon","Ambikapur","Raigarh",
  "Dhamtari","Bemetara","Giridih","Deoghar","Ramgarh","Chaibasa","Dumka",
  "Medininagar","Jharia","Chas","Berhampur","Balasore","Bhadrak","Baripada",
  "Jharsuguda","Puri","Angul","Balangir","Koraput","Rayagada","Paradip",
  "Bhawanipatna","Nagaon","Jorhat","Goalpara","Sivasagar","Diphu","Karimganj",
  "Lakhimpur","Kurseong","Darjeeling","Haldia","Krishnanagar","Baharampur",
  "Malda","Raiganj","Purulia","Bankura","Midnapore","Alipurduar","Cooch Behar",
  "Jalpaiguri","Habra","Bongaon","Baranagar","Serampore","Chinsurah","Bidha",
  // Top metros (also included to make sure they exist)
  "Mumbai","Delhi","Bangalore","Kolkata","Chennai","Hyderabad","Ahmedabad",
  "Pune","Surat",
];

const seed = async () => {
  try {
    console.log('🌱 Starting city seeder...');

    const cityDocs = cities.map((name) => ({
      name: name.trim(),
      isMetro: metroCities.has(name.trim()),
      isActive: true,
    }));

    // insertMany with ordered:false → skips duplicates and continues
    const result = await City.insertMany(cityDocs, { ordered: false });
    console.log(`✅ Successfully inserted ${result.length} cities.`);
  } catch (err) {
    if (err.code === 11000 || (err.writeErrors && err.insertedDocs)) {
      // Partial success — some cities already existed
      const inserted = err.result?.nInserted ?? err.insertedDocs?.length ?? '?';
      console.log(`✅ Inserted ${inserted} new cities. Duplicates were skipped.`);
    } else {
      console.error('❌ Seeder error:', err.message);
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database disconnected.');
    process.exit(0);
  }
};

seed();
