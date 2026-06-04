import emailjs from '@emailjs/browser';

const SERVICE_ID = 'service_ycgbalr';
const VERIFY_TEMPLATE_ID = 'template_8mznzxg';
const RESET_TEMPLATE_ID = 'template_1cgkf9l';
const PUBLIC_KEY = 'p4DAZcghkv52q_IcL';

export const sendVerificationCode = async (email: string, fullName: string, code: string) => {
  try {
    const templateParams = {
      user_email: email,
      full_name: fullName || 'Değerli Kullanıcımız',
      verification_code: code,
    };

    const response = await emailjs.send(
      SERVICE_ID,
      VERIFY_TEMPLATE_ID,
      templateParams,
      {
        publicKey: PUBLIC_KEY,
      }
    );
    return response;
  } catch (error: any) {
    console.error('Email sending failed:', error);
    throw new Error(error?.text || error?.message || 'E-posta gönderilemedi. EmailJS ayarlarınızı kontrol edin.');
  }
};

export const sendResetCode = async (email: string, code: string) => {
  try {
    const templateParams = {
      user_email: email,
      reset_code: code,
    };

    const response = await emailjs.send(
      SERVICE_ID,
      RESET_TEMPLATE_ID,
      templateParams,
      {
        publicKey: PUBLIC_KEY,
      }
    );
    return response;
  } catch (error: any) {
    console.error('Email sending failed:', error);
    throw new Error(error?.text || error?.message || 'E-posta gönderilemedi. EmailJS ayarlarınızı kontrol edin.');
  }
};

export const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
