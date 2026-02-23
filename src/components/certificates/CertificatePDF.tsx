import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";

export const generateCertificatePDF = async (certData: {
    title: string;
    userName: string;
    issuedDate: string;
    verificationCode: string;
    description?: string;
}) => {
    const verificationUrl = `${window.location.origin}/verify/${certData.verificationCode}`;

    // Create a hidden template element
    const element = document.createElement('div');
    element.style.width = '1000px';
    element.style.padding = '60px';
    element.style.background = 'linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%)';
    element.style.color = 'white';
    element.style.fontFamily = 'sans-serif';
    element.style.position = 'fixed';
    element.style.left = '-2000px';
    element.style.top = '0';
    element.style.borderRadius = '20px';
    element.style.border = '10px solid #7C3AED'; // Primary color border

    element.innerHTML = `
    <div style="border: 2px solid rgba(255,255,255,0.1); padding: 40px; text-align: center; border-radius: 10px; background: rgba(255,255,255,0.02);">
      <div style="margin-bottom: 30px;">
        <span style="font-size: 14px; text-transform: uppercase; letter-spacing: 4px; color: #7C3AED; font-weight: bold;">Certificate of Achievement</span>
      </div>
      
      <h1 style="font-size: 48px; margin-bottom: 10px; color: white;">${certData.title}</h1>
      
      <div style="margin: 40px 0;">
        <p style="font-size: 18px; color: rgba(255,255,255,0.6); margin-bottom: 5px;">This is to certify that</p>
        <p style="font-size: 36px; font-weight: bold; color: #7C3AED; margin: 0;">${certData.userName}</p>
        <p style="font-size: 18px; color: rgba(255,255,255,0.6); margin-top: 5px;">has successfully completed the requirements for this certification.</p>
      </div>

      <p style="font-size: 16px; color: rgba(255,255,255,0.5); max-width: 600px; margin: 0 auto 40px;">
        ${certData.description || "Demonstrated excellence and commitment in mastering the subject matter through rigorous learning and practical application."}
      </p>

      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 60px; padding-top: 30px; border-top: 1px solid rgba(255,255,255,0.1);">
        <div style="text-align: left;">
          <p style="font-size: 12px; color: rgba(255,255,255,0.4); margin-bottom: 2px;">ISSUED ON</p>
          <p style="font-size: 18px; font-weight: bold; color: white;">${certData.issuedDate}</p>
          
          <div style="margin-top: 20px;">
            <p style="font-size: 10px; color: rgba(255,255,255,0.4); margin-bottom: 2px;">VERIFICATION CODE</p>
            <p style="font-size: 14px; font-family: monospace; color: #7C3AED;">${certData.verificationCode}</p>
          </div>
        </div>

        <div style="text-align: right;">
          <div id="qr-container" style="background: white; padding: 10px; border-radius: 10px; display: inline-block; margin-bottom: 5px;">
            <!-- QR code will be injected here if we were using a DOM approach, 
                 but we'll use a simpler canvas-to-img approach for better PDF compatibility -->
             <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(verificationUrl)}" width="100" height="100" />
          </div>
          <p style="font-size: 10px; color: rgba(255,255,255,0.4);">Scan to verify authenticity</p>
        </div>
      </div>
      
      <div style="margin-top: 40px; font-size: 12px; color: rgba(255,255,255,0.3);">
        Verified by Wena AI Learning Platform
      </div>
    </div>
  `;

    document.body.appendChild(element);

    try {
        // Wait for images (QR code) to load
        await new Promise(resolve => setTimeout(resolve, 1000));

        const dataUrl = await toPng(element, { quality: 1.0 });
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [1000, 700] // Matching template size
        });

        pdf.addImage(dataUrl, 'PNG', 0, 0, 1000, 700);
        pdf.save(`Certificate_${certData.verificationCode}.pdf`);
    } catch (err) {
        console.error("PDF Generation Error:", err);
        throw err;
    } finally {
        document.body.removeChild(element);
    }
};
