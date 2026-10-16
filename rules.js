/* QuarterReady rules: the single place where UK tax rules used by the site and the app live.
   Updated by the monthly rules check. Every value must come from a GOV.UK / HMRC source listed below.
   Dates are [month, day]. Money in pounds, mileage in pence per mile. */
window.QR_RULES = {
  version: 1,
  checked: "2026-10-16",

  // MTD for Income Tax: qualifying income in `year` (tax year starting 6 April) over `limit` => MTD from 6 April `start`.
  thresholds: [
    { year: 2024, limit: 50000, start: 2026 },
    { year: 2025, limit: 30000, start: 2027 },
    { year: 2026, limit: 20000, start: 2028 }
  ],

  // Quarterly update deadlines (same for standard and calendar quarters) and the tax return deadline.
  deadlines: { quarters: [[8, 7], [11, 7], [2, 7], [5, 7]], finalReturn: [1, 31] },

  // Turnover under this may send a single consolidated expenses figure.
  consolidatedExpensesLimit: 90000,

  // HMRC simplified mileage rates. The first entry whose `from` (tax year) is <= the year applies.
  mileage: [
    { from: 2026, car1: 55, car2: 25, moto: 24, band: 10000 },
    { from: 0, car1: 45, car2: 25, moto: 24, band: 10000 }
  ],

  // Shown on the home page under "What's changed". Newest first. Only confirmed, sourced facts.
  news: [
    { date: "2028-04-06", upcoming: true, title: "MTD reaches qualifying income over £20,000",
      body: "Sole traders and landlords with more than £20,000 of qualifying income in 2026–27 must use MTD from 6 April 2028.",
      url: "https://www.gov.uk/guidance/find-out-if-and-when-you-need-to-use-making-tax-digital-for-income-tax" },
    { date: "2027-04-06", upcoming: true, title: "MTD reaches qualifying income over £30,000",
      body: "If your qualifying income in 2025–26 was over £30,000, you must use MTD from 6 April 2027. The first quarterly update is due by 7 August 2027.",
      url: "https://www.gov.uk/guidance/find-out-if-and-when-you-need-to-use-making-tax-digital-for-income-tax" },
    { date: "2026-04-06", title: "Mileage rate rises to 55p",
      body: "From the 2026–27 tax year, the simplified flat rate for cars and vans is 55p a mile for the first 10,000 business miles (previously 45p), then 25p.",
      url: "https://www.gov.uk/simpler-income-tax-simplified-expenses/vehicles" },
    { date: "2026-04-06", title: "MTD for Income Tax starts",
      body: "Sole traders and landlords with qualifying income over £50,000 in 2024–25 now keep digital records and send quarterly updates.",
      url: "https://www.gov.uk/guidance/find-out-if-and-when-you-need-to-use-making-tax-digital-for-income-tax" }
  ],

  sources: [
    { name: "When you need to use MTD for Income Tax", url: "https://www.gov.uk/guidance/find-out-if-and-when-you-need-to-use-making-tax-digital-for-income-tax" },
    { name: "Work out your qualifying income", url: "https://www.gov.uk/guidance/work-out-your-qualifying-income-for-making-tax-digital-for-income-tax" },
    { name: "Exemptions", url: "https://www.gov.uk/guidance/find-out-if-you-can-get-an-exemption-from-making-tax-digital-for-income-tax" },
    { name: "Quarterly updates", url: "https://makingtaxdigital.campaign.gov.uk/quarterly-updates/" },
    { name: "Simplified expenses: vehicles", url: "https://www.gov.uk/simpler-income-tax-simplified-expenses/vehicles" }
  ]
};
