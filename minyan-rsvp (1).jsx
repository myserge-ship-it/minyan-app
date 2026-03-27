import { useState, useEffect } from "react";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, set, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyByoNEhZBTchmAVAnnQXQLlJck1Ig9halc",
  authDomain: "minyan-count.firebaseapp.com",
  projectId: "minyan-count",
  storageBucket: "minyan-count.firebasestorage.app",
  messagingSenderId: "836859092462",
  appId: "1:836859092462:web:59443511aade383d8b82ff",
  databaseURL: "https://minyan-count-default-rtdb.europe-west1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const SERVICES = [
  { id: "shacharit", name: "שחרית", time: "תפילת הבוקר", emoji: "🌅" },
  { id: "mincha", name: "מנחה", time: "תפילת הצהריים", emoji: "☀️" },
  { id: "maariv", name: "מעריב", time: "תפילת הערב", emoji: "🌙" },
];

const MINYAN = 10;

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function getUserId() {
  let id = localStorage.getItem("minyan-user-id");
  if (!id) {
    id = "user-" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("minyan-user-id", id);
  }
  return id;
}

export default function MinyanApp() {
  const [userId] = useState(getUserId);
  const [nameInput, setNameInput] = useState("");
  const [name, setName] = useState(() => localStorage.getItem("minyan-name") || "");
  const [nameSet, setNameSet] = useState(() => !!localStorage.getItem("minyan-name"));
  const [rsvps, setRsvps] = useState({ shacharit: {}, mincha: {}, maariv: {} });
  const [toast, setToast] = useState(null);

  const today = new Date().toLocaleDateString("he-IL", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  // Listen to Firebase in real time
  useEffect(() => {
    const todayKey = getTodayKey();
    const unsubscribers = SERVICES.map(service => {
      const dbRef = ref(db, `rsvp/${todayKey}/${service.id}`);
      return onValue(dbRef, (snapshot) => {
        const data = snapshot.val() || {};
        setRsvps(prev => ({ ...prev, [service.id]: data }));
      });
    });
    return () => unsubscribers.forEach(unsub => unsub());
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleSetName = () => {
    const n = nameInput.trim();
    if (!n) return;
    localStorage.setItem("minyan-name", n);
    setName(n);
    setNameSet(true);
    showToast("ברוך הבא, " + n + "! 🙏");
  };

  const isAttending = (serviceId) => !!rsvps[serviceId]?.[userId];

  const toggleService = (serviceId) => {
    const todayKey = getTodayKey();
    const serviceName = SERVICES.find(s => s.id === serviceId).name;
    const dbRef = ref(db, `rsvp/${todayKey}/${serviceId}/${userId}`);

    if (isAttending(serviceId)) {
      remove(dbRef);
      showToast("הוסרת מ" + serviceName);
    } else {
      set(dbRef, { name, timestamp: Date.now() });
      const count = Object.keys(rsvps[serviceId] || {}).length + 1;
      if (count >= MINYAN) {
        showToast("🎉 יש מניין! " + count + " אנשים אישרו!");
      } else {
        showToast(`✓ נרשמת! ${count}/${MINYAN} אישרו`);
      }
    }
  };

  const getAttendees = (serviceId) => Object.values(rsvps[serviceId] || {});
  const getCount = (serviceId) => getAttendees(serviceId).length;
  const hasMinyan = (serviceId) => getCount(serviceId) >= MINYAN;

  if (!nameSet) {
    return (
      <div dir="rtl" style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f1b2d 0%, #1a2d4a 50%, #0f1b2d 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'David Libre', 'Times New Roman', serif",
        padding: "20px"
      }}>
        <div style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(212,175,55,0.3)",
          borderRadius: "20px", padding: "40px 32px",
          maxWidth: "360px", width: "100%", textAlign: "center",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
        }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🕍</div>
          <h1 style={{ color: "#d4af37", fontSize: "28px", fontWeight: "bold", margin: "0 0 6px" }}>
            מעקב מניין
          </h1>
          <p style={{ color: "#8ab4d4", fontSize: "14px", margin: "0 0 28px", lineHeight: "1.6" }}>
            הכנס את שמך כדי לאשר נוכחות בתפילות
          </p>
          <input
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSetName()}
            placeholder="שמך הפרטי"
            dir="rtl"
            style={{
              width: "100%", padding: "14px 16px", borderRadius: "10px",
              border: "1px solid rgba(212,175,55,0.4)",
              background: "rgba(255,255,255,0.08)", color: "#fff",
              fontSize: "16px", fontFamily: "'David Libre', serif",
              outline: "none", boxSizing: "border-box",
              marginBottom: "14px", textAlign: "center"
            }}
            autoFocus
          />
          <button onClick={handleSetName} style={{
            width: "100%", padding: "14px", borderRadius: "10px", border: "none",
            background: "linear-gradient(135deg, #d4af37, #b8941f)",
            color: "#0f1b2d", fontWeight: "bold", fontSize: "16px",
            cursor: "pointer", fontFamily: "'David Libre', serif"
          }}>
            כניסה ←
          </button>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f1b2d 0%, #1a2d4a 50%, #0f1b2d 100%)",
      fontFamily: "'David Libre', 'Times New Roman', serif",
      color: "#fff", padding: "20px 16px 40px"
    }}>
      {toast && (
        <div style={{
          position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)",
          background: "rgba(212,175,55,0.95)", color: "#0f1b2d",
          padding: "10px 22px", borderRadius: "30px", fontWeight: "bold",
          fontSize: "14px", zIndex: 1000, whiteSpace: "nowrap",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)"
        }}>
          {toast}
        </div>
      )}

      <div style={{ textAlign: "center", marginBottom: "28px", paddingTop: "10px" }}>
        <div style={{ fontSize: "40px", marginBottom: "6px" }}>🕍</div>
        <h1 style={{ color: "#d4af37", fontSize: "26px", fontWeight: "bold", margin: "0 0 4px" }}>
          מעקב מניין
        </h1>
        <p style={{ color: "#8ab4d4", fontSize: "13px", margin: "0 0 6px" }}>{today}</p>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "12px", margin: 0 }}>
          שלום, <span style={{ color: "#d4af37" }}>{name}</span>
        </p>
      </div>

      <div style={{ maxWidth: "420px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "16px" }}>
        {SERVICES.map(service => {
          const count = getCount(service.id);
          const attending = isAttending(service.id);
          const minyan = hasMinyan(service.id);
          const pct = Math.min(count / MINYAN, 1);
          const attendees = getAttendees(service.id);

          return (
            <div key={service.id} style={{
              background: attending ? "rgba(212,175,55,0.1)" : "rgba(255,255,255,0.04)",
              border: attending ? "1px solid rgba(212,175,55,0.5)" : "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px", padding: "20px", transition: "all 0.3s ease"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                    <span style={{ fontSize: "20px" }}>{service.emoji}</span>
                    <span style={{ fontSize: "22px", fontWeight: "bold", color: "#fff" }}>{service.name}</span>
                  </div>
                  <div style={{ color: "#8ab4d4", fontSize: "12px", paddingRight: "28px" }}>{service.time}</div>
                </div>
                <div style={{
                  background: minyan ? "rgba(72,199,116,0.2)" : "rgba(255,255,255,0.07)",
                  border: `1px solid ${minyan ? "rgba(72,199,116,0.5)" : "rgba(255,255,255,0.15)"}`,
                  borderRadius: "20px", padding: "4px 10px", fontSize: "12px",
                  color: minyan ? "#48c774" : "#8ab4d4", fontWeight: "bold", whiteSpace: "nowrap"
                }}>
                  {minyan ? "✓ יש מניין!" : `${count}/${MINYAN}`}
                </div>
              </div>

              <div style={{
                background: "rgba(255,255,255,0.08)", borderRadius: "6px",
                height: "6px", marginBottom: "14px", overflow: "hidden", direction: "ltr"
              }}>
                <div style={{
                  height: "100%", width: `${pct * 100}%`,
                  background: minyan ? "linear-gradient(90deg, #48c774, #23d160)" : "linear-gradient(90deg, #d4af37, #f0c840)",
                  borderRadius: "6px", transition: "width 0.4s ease"
                }} />
              </div>

              {attendees.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
                  {attendees.map((a, i) => (
                    <span key={i} style={{
                      background: a.name === name ? "rgba(212,175,55,0.2)" : "rgba(255,255,255,0.07)",
                      border: `1px solid ${a.name === name ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.12)"}`,
                      borderRadius: "20px", padding: "3px 10px", fontSize: "12px",
                      color: a.name === name ? "#d4af37" : "#ccc"
                    }}>
                      {a.name || "אנונימי"}
                    </span>
                  ))}
                  {count < MINYAN && (
                    <span style={{
                      borderRadius: "20px", padding: "3px 10px", fontSize: "12px",
                      color: "rgba(255,255,255,0.3)", border: "1px dashed rgba(255,255,255,0.15)"
                    }}>
                      עוד {MINYAN - count} חסרים
                    </span>
                  )}
                </div>
              )}

              <button onClick={() => toggleService(service.id)} style={{
                width: "100%", padding: "13px", borderRadius: "10px",
                border: attending ? "none" : "1px solid rgba(212,175,55,0.4)",
                background: attending ? "linear-gradient(135deg, #d4af37, #b8941f)" : "transparent",
                color: attending ? "#0f1b2d" : "#d4af37",
                fontWeight: "bold", fontSize: "15px", cursor: "pointer",
                fontFamily: "'David Libre', serif", transition: "all 0.2s ease"
              }}>
                {attending ? "✓ אני מגיע — ביטול" : "אני מגיע מחר ←"}
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: "center", marginTop: "28px", color: "rgba(255,255,255,0.25)", fontSize: "11px", lineHeight: "1.8" }}>
        הרשמות מתאפסות בחצות כל לילה<br/>
        שתפו את הקישור בקבוצת הווטסאפ
      </div>
    </div>
  );
}
