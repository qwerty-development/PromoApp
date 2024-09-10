import QRCode from 'qrcode';
import { supabase } from '@/lib/supabase';

export async function generateAndStoreQRCode(promotionId: number): Promise<string> {
  const uniqueId = `PROMO-${promotionId}-${Date.now()}`;
  
  // Generate QR code
  const qrCodeDataURL = await QRCode.toDataURL(uniqueId);
  
  // Store the QR code information in the database
  const { data, error } = await supabase
    .from('promotion_qr_codes')
    .insert({ promotion_id: promotionId, unique_id: uniqueId, qr_code_url: qrCodeDataURL })
    .select()
    .single();

  if (error) {
    console.error('Error storing QR code:', error);
    throw error;
  }

  return data.qr_code_url;
}

export async function getPromotionQRCode(promotionId: number): Promise<string | null> {
  const { data, error } = await supabase
    .from('promotion_qr_codes')
    .select('qr_code_url')
    .eq('promotion_id', promotionId)
    .single();

  if (error) {
    console.error('Error fetching QR code:', error);
    return null;
  }

  return data?.qr_code_url || null;
}