import Link from "next/link";
import { BrandMark } from "./BrandMark";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-wave" aria-hidden="true" />
      <div className="footer-main">
        <div className="footer-brand">
          <BrandMark compact />
          <div>
            <strong>Happy Hearts on Wheels</strong>
            <p>Fresh choices and a sunny little island feel in Malvern.</p>
          </div>
        </div>

        <div className="footer-details">
          <p><strong>Open</strong> Friday–Tuesday, 11 AM–7 PM</p>
          <p><strong>Find us</strong> 801 Hwy 270, Malvern, AR 72104</p>
          <p><strong>Call</strong> <a href="tel:+15016131513">501-613-1513</a></p>
        </div>

        <div className="footer-links">
          <Link href="/menu">Full menu</Link>
          <Link href="/order">Order online</Link>
          <a href="mailto:happyhearts2026@outlook.com">Email us</a>
          <a
            href="https://www.hometownwebservicesar.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Website by Hometown Web Services
          </a>
        </div>
      </div>

      <div className="footer-fine-print">
        <span>♥</span>
        <p>
          Menu items and ingredient availability may change. Please tell us about allergies before
          ordering. Heart-conscious and diabetic-friendly choices are not medical advice.
        </p>
      </div>
    </footer>
  );
}
