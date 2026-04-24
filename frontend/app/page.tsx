export default function Home() {
  return (
    <main style={{ padding: "40px", fontFamily: "Arial, sans-serif", maxWidth: "980px", margin: "0 auto" }}>
      <section style={{ marginBottom: "40px" }}>
        <p style={{ fontWeight: 600, color: "#4b5563" }}>WorkTwin Care Pilot</p>
        <h1 style={{ fontSize: "44px", lineHeight: "1.1", margin: "10px 0" }}>
          Give every employee a private AI work and learning companion.
        </h1>
        <p style={{ fontSize: "20px", color: "#4b5563", lineHeight: "1.6" }}>
          WorkTwin helps care providers turn policies, procedures and onboarding documents into a trusted AI staff assistant.
        </p>
        <button style={{ padding: "14px 22px", borderRadius: "10px", border: "none", background: "#111827", color: "white", fontWeight: 700 }}>
          Book a pilot
        </button>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "16px", padding: "24px" }}>
          <h2>Employee Assistant</h2>
          <p>Ask questions about policies, onboarding, procedures and role expectations.</p>
          <div style={{ background: "#f9fafb", padding: "16px", borderRadius: "12px", marginTop: "16px" }}>
            <strong>Example:</strong>
            <p>What do I do if a service user refuses medication?</p>
          </div>
        </div>

        <div style={{ border: "1px solid #e5e7eb", borderRadius: "16px", padding: "24px" }}>
          <h2>Anonymous Insights</h2>
          <p>Managers see training gaps and policy confusion trends, not private employee chats.</p>
          <ul>
            <li>Safeguarding questions</li>
            <li>Medication process confusion</li>
            <li>Incident reporting gaps</li>
            <li>Onboarding support needs</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
