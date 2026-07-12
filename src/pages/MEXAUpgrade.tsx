import React from "react";
import { useNavigate } from "react-router-dom";

export default function MEXAUpgrade() {
  const navigate = useNavigate();

  const plans = [
    {
      name: "MEXA Plus",
      price: "R280/month",
      description: "For students and everyday AI users",
      features: [
        "Voice AI assistant",
        "Unlimited conversations",
        "Image uploads",
        "Study assistance",
        "Career support",
      ],
    },
    {
      name: "MEXA Pro",
      price: "R570/month",
      description: "For creators and professionals",
      features: [
        "Everything in Plus",
        "Advanced AI",
        "Research assistant",
        "Coding help",
        "Business planning",
      ],
    },
    {
      name: "MEXA Business",
      price: "R1580/month",
      description: "For companies and teams",
      features: [
        "MEXA Co-workers",
        "Team dashboard",
        "Business AI tools",
        "Admin controls",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-black px-6 py-10 text-white">

      <h1 className="text-center text-4xl font-bold">
        Upgrade to MEXA
      </h1>

      <p className="mt-3 text-center text-white/60">
        Unlock your AI companion
      </p>


      <div className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-3">

        {plans.map((plan) => (
          <div
            key={plan.name}
            className="rounded-3xl border border-white/10 bg-white/5 p-6"
          >

            <h2 className="text-2xl font-bold">
              {plan.name}
            </h2>

            <p className="mt-2 text-3xl font-bold text-emerald-400">
              {plan.price}
            </p>

            <p className="mt-3 text-white/60">
              {plan.description}
            </p>


            <ul className="mt-6 space-y-3">
              {plan.features.map((feature)=>(
                <li key={feature}>
                  ✓ {feature}
                </li>
              ))}
            </ul>


            <button
              onClick={() => navigate("/mexa")}
              className="mt-8 w-full rounded-full bg-white py-3 font-bold text-black"
            >
              Choose Plan
            </button>

          </div>
        ))}

      </div>

    </div>
  );
}
