const nodemailer = require('nodemailer');
const Subscriber = require('../models/Subscriber');

// Configurar el transporter de nodemailer - CORRECCIÓN: createTransport
const transporter = nodemailer.createTransport({
  service: 'gmail', // o el servicio que uses
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.subscribe = async (req, res) => {
  try {
    const { email } = req.body;

    // Validar email
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    // Verificar si ya está suscrito
    const existingSubscriber = await Subscriber.findOne({ email });
    if (existingSubscriber) {
      return res.status(400).json({ error: 'Este email ya está suscrito' });
    }

    // Guardar en la base de datos
    const subscriber = new Subscriber({ email });
    await subscriber.save();

    // Enviar email de confirmación
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: '¡Bienvenida/o a By Luciana Aliendo!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">¡Gracias por suscribirte!</h2>
          <p style="color: #666; font-size: 16px;">
            Hola,<br><br>
            Te damos la bienvenida a la familia de <strong>By Luciana Aliendo</strong>. 
            Estamos emocionados de tenerte con nosotros.
          </p>
          <p style="color: #666; font-size: 16px;">
            A partir de ahora recibirás:
          </p>
          <ul style="color: #666; font-size: 16px;">
            <li>📦 Novedades de nuevos ingresos</li>
            <li>💰 Promociones exclusivas</li>
            <li>🎁 Descuentos especiales para suscriptores</li>
            <li>👗 Lanzamientos de nuevas colecciones</li>
          </ul>
          <p style="color: #666; font-size: 16px;">
            Como agradecimiento por tu suscripción, aquí tienes tu código de descuento:
          </p>
          <div style="text-align: center; margin: 20px 0;">
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border: 2px dashed #007bff;">
              <strong style="font-size: 18px; color: #007bff;">BIENVENIDA10</strong>
              <p style="margin: 10px 0 0 0; color: #666;">10% DE DESCUENTO EN TU PRIMERA COMPRA</p>
            </div>
          </div>
          <p style="color: #666; font-size: 16px;">
            Si en algún momento deseas cancelar tu suscripción, puedes hacerlo respondiendo a este email.
          </p>
          <p style="color: #666; font-size: 16px;">
            ¡Gracias por elegirnos!<br>
            <strong>El equipo de By Luciana Aliendo</strong>
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({ 
      success: true, 
      message: '¡Gracias por suscribirte! Te hemos enviado un email de confirmación.' 
    });

  } catch (error) {
    console.error('Error en suscripción:', error);
    res.status(500).json({ error: 'Error al procesar la suscripción' });
  }
};