const admin = require('firebase-admin');

const serviceAccount = {
  type: "service_account",
  project_id: "connects-india",
  private_key_id: "97a4b8747c8e28a29dff12403aa55046dcb54fd3",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCvv/aDLnyR415V\ndFhOC+LrLPUHLN5bwP8YPsYguhDCRU9YcEU/5PutCiJonSLJkYv+DH7ExSReAck1\nKrK3AKHh9NcH/qM5N6Ke6C1O24733+FJ6Cja7JoJXEERuygh2mEE5YxNfNgS41WF\n8w96Ra6y+rDq134sum3TAHZwjLKy0nRWVjR6ragSUxBCHDHM8/sOnElBUmOK3MKQ\nQMfhOlKKEsKmjoQeSdIUFhFIRyPVCBDnnJtx+R+H30nHBi1Y9BtMt53hW8vS3HMW\nE8uBnveX6oUc/m0g1831BGyQKl/8OfqpaIpYEraA0rWXfS0XuDOb6+vILMiC1J+a\nJT5zlWVNAgMBAAECggEAIWSfveKkDCMvrhx2V9P12Hn5D5U0panovk5VHmxEGWmK\nbzMb0U1cjY8epRJwROzY9NsibhhINe1wcd/sR43A9HotLklxcYJy7W8Phst8YXgi\nKgUI2Dn69ZrYCTquoCoKY6AK9cEqHAKiYhph/zlEvaCY43Iw+OYuTlho6K8vF/9I\nRmfkZ4ZxKmOdmBxbTOm167bqo0L60QLNJLJOEEXTuMFlVmlC6mzgO83LGDIYCBDF\nMMCOQF/TCgNPhi3viV+WRB+PZ2LlblMvkb9G8a/Lvavb7P7lynhnZCcSmfaruZWO\nZW0Zk1GgRhUjuvZRMWbpKt+sq1YTRbRse2807nKB0QKBgQDsG05uvwDSmX5oh9qX\nBUpJmxxy5xHBHC49WRTB9hL+A9gttIEqFtAp74+uzq0MutfIBWzMfcdlOzvW99rU\nr6kAhN+IVJjXOu5TujVZRwyDNxI9WLuMgyx9rCSiTtD7CzQNuXw7MJTeo4PFmplQ\n8MP+3nzXgSHY32RXk313QFvTsQKBgQC+jsrsTCdELEKBQgVMSCs8ZHWBKiNRAV1L\nqsYOxxdQsD+A8N41mcy7BvIfrjkGCmNolEZu2WzsNBL4/WgCl39XSlUpZ8VEU0CC\nAqc3h6AsfFxCTRJWhEPe/ZWdYrHWn/xkVMx6utClXQEbUBg5eR5+VWvXIY3pis4x\nq+f4QobeXQKBgQC+1Qs9w698iId9IWDx81qpx27lCBJ3jLlq6Fc4thV/rcfKmTxU\nsn+phXESjwWbZmEF0Cyx02+YSJoDE+2RPjFQtBSf8hBe1cjPb4+zCxP38kkRwGhG\nF7ecE8jATwfmAJYgCa15gbixgmP9EQmePBuOInGxFTQwP86wYgtkmWYe4QKBgHQa\n1sMxBz+/Y+oTytyWoFlUsE+51/jURv8Cl1iLr8YHDTpICGxKQHa4HbB12+K1U6p1\npZCGw5oLhH/XDpd9rSYHcWogAw7FVumgKjhoV4yjXSc8hG7Yee4VPiK97rNhmUuc\na1ZgGx6WU0VMAOaLyKua6nESzb+9RjL3lggqqLg1AoGBAJ6wDy8xSTDTiz3uI4ec\nOSYluwUzKeExOpg6ihl1SMOt9eiXgWHTtzKSNH8TO3XuRWQP+FkkjemMBdE5v0wH\nCFanFAoxya6utXruKKCGgQwHfLOd/TSpBL5xBQobhz+ceYXYQsevV9V5xYx+HKHV\nZ8RR+shQH47mE94S4W0o4d45\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@connects-india.iam.gserviceaccount.com",
  client_id: "111148489153872708058",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40connects-india.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'connects-india'
});

module.exports = admin;