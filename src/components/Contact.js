import React, { useState } from 'react';
import '../styles/Contact.css'; // Import the styles for the contact form

const Contact = () => {
    const [formData, setFormData] = useState({
        email: '',
        message: '',
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Prepare mailto link
        const mailtoLink = `mailto:chanyikchong@outlook.com?subject=Contact%20Form%20Message&body=From:%20${encodeURIComponent(
            formData.email
        )}%0D%0A%0D%0A${encodeURIComponent(formData.message)}`;

        // Copy the message to clipboard
        navigator.clipboard.writeText(formData.message).then(() => {
            alert('Message copied to clipboard! Now sending via your mail client...');
        });

        // Open the user's default email client
        window.location.href = mailtoLink;
    };

    return (
        <div className="contact-container">
            <h1>Say hello</h1>
            <form className="contact-form" onSubmit={handleSubmit}>
                <div className="form-group">
                    <input
                        type="email"
                        name="email"
                        placeholder="Your email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
          <textarea
              name="message"
              placeholder="Message"
              value={formData.message}
              onChange={handleChange}
              required
          />
                </div>
                <button type="submit" className="submit-button">
                    Send message
                </button>
            </form>
        </div>
    );
};

export default Contact;
