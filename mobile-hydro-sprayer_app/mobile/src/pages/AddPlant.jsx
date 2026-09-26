import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { plantApi } from "../api/api";
import Navbar from "../components/Navbar";
import TopHeader from "../components/TopHeader";

export default function AddPlant() {
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();
  const [plantName, setPlantName] = useState("");
  const [preferredMoisture, setPreferredMoisture] = useState(60);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await plantApi.add({
        uid: firebaseUser.uid,
        plant_name: plantName,
        preferred_moisture: Number(preferredMoisture),
      });
      toast.success("Plant added!");
      navigate("/plants");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not add plant");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pb-24">
      <TopHeader title="Add Plant" />

      <form onSubmit={handleSubmit} className="px-4 mt-4 space-y-4">
        <div>
          <label className="text-sm text-gray-600">Plant name</label>
          <input
            required
            value={plantName}
            onChange={(e) => setPlantName(e.target.value)}
            placeholder="e.g. Tomato Plant"
            className="w-full mt-1 rounded-lg border border-gray-300 px-4 py-3"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">
            Preferred moisture: <span className="font-semibold">{preferredMoisture}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={preferredMoisture}
            onChange={(e) => setPreferredMoisture(e.target.value)}
            className="w-full accent-brand mt-1"
          />
        </div>

        <p className="text-xs text-gray-400">
          Planting date and sensor/pump pin assignment are set automatically. You can view the
          exact pin wiring for this plant afterwards from the Plants tab.
        </p>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-brand text-white rounded-lg py-3 font-semibold disabled:opacity-60"
        >
          {submitting ? "Adding..." : "Add Plant"}
        </button>
      </form>

      <Navbar />
    </div>
  );
}
