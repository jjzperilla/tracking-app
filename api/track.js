const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const express = require("express");
const cors = require("cors");

// Use Stealth Plugin
puppeteer.use(StealthPlugin());

// Import Chromium from sparticuz
const chromium = require("@sparticuz/chromium");

const app = express();
app.use(cors());

app.get("/api/track", async (req, res) => {
  const trackingNumber = req.query.num;
  if (!trackingNumber) {
    return res.status(400).json({ error: "Tracking number is required" });
  }

  const url = `https://parcelsapp.com/en/tracking/${trackingNumber}`;
  let browser;

  try {
    // Launch Puppeteer with Chromium's executable path
    browser = await puppeteer.launch({
      headless: true,
      executablePath: chromium.executablePath, // Use the correct executable path
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
    );

    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    await page.waitForFunction(() => {
      return !document.body.innerText.includes("Please reload the page");
    }, { timeout: 60000 });

    const trackingEvents = await page.evaluate(() => {
      return Array.from(document.querySelectorAll(".event")).map(event => ({
        date: event.querySelector(".event-time strong")?.innerText.trim() || "N/A",
        time: event.querySelector(".event-time span")?.innerText.trim() || "N/A",
        status: event.querySelector(".event-content strong")?.innerText.trim() || "N/A",
        courier: event.querySelector(".carrier")?.innerText.trim() || "N/A"
      }));
    });

    const parcelInfo = await page.evaluate(() => {
      const getText = (selector) => document.querySelector(selector)?.innerText.trim() || "N/A";

      return {
        tracking_number: getText(".parcel-attributes tr:nth-child(1) .value span"),
        origin: getText(".parcel-attributes tr:nth-child(2) .value span:nth-child(2)"),
        destination: getText(".parcel-attributes tr:nth-child(3) .value span:nth-child(2)"),
        courier: getText(".parcel-attributes tr:nth-child(4) .value a"),
        days_in_transit: getText(".parcel-attributes tr:nth-child(6) .value span"),
        tracking_link: getText(".tracking-link input")
      };
    });

    if (!trackingEvents.length) {
      return res.status(404).json({ error: "Tracking information not found." });
    }

    res.json({
      tracking_details: trackingEvents,
      parcel_info: parcelInfo
    });

  } catch (error) {
    console.error("Scraping error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    if (browser) await browser.close();
  }
});

// Use the environment's port if available (Render, Heroku, etc.)
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;
