import "./HowToPlay.css";
const LIFELINES = [
  {
    number: "01",
    title: "Code for me bro!",
    text: (
      <>
        Choose another participant to help answer the question.
        If they answer correctly, they receive <strong>+50 points</strong>.
        If they answer incorrectly, they receive a{" "}
        <strong>−50 point penalty</strong>.
      </>
    ),
  },
  {
    number: "02",
    title: "50:50",
    text: (
      <>
        Two incorrect answer choices are removed, leaving
        <strong> two options</strong> for the Hot Seat player.
      </>
    ),
  },
  {
    number: "03",
    title: "Together We Stand",
    text: (
      <>
        Ask the audience for help. Every participant who votes for the
        correct answer receives <strong>+25 points</strong>.
      </>
    ),
  },
];

const SIDE_QUESTS = [
  {
    number: "01",
    title: "The Bug Bounty",
    text:
      "Solve a micro-puzzle faster than everyone else to steal bonus points or unlock a special badge.",
  },
  {
    number: "02",
    title: "Code Detective",
    text:
      "Find security vulnerabilities in a provided piece of code before the Hot Seat player locks in their answer.",
  },
  {
    number: "03",
    title: "Regex Roulette",
    text:
      "Write the exact regular expression needed to extract only the matching data from a massive wall of chaotic text.",
  },
  {
    number: "04",
    title: "Refactoring Race",
    text:
      "Compress a messy 50-line function into 3 clean, efficient lines within 2 minutes.",
  },
];

export default function HowToPlay() {
  return (
    <section id="how-to-play" className="kbcp-how">

      <div className="container">

        {/* HEADER */}

        <header className="kbcp-how__header">
          <span className="kbcp-how__eyebrow">
            THE GAME
          </span>

          <h2>HOW TO PLAY</h2>

          <p>
            Two rounds. Twelve finalists. One Hot Seat.
          </p>
        </header>


        {/* ROUND 1 */}

        <article className="kbcp-round">

          <div className="kbcp-round__heading">

            <div className="kbcp-round__number">
              01
            </div>

            <div>
              <span className="kbcp-round__eyebrow">
                ROUND ONE
              </span>

              <h3>
                Fastest Fingers First
              </h3>

              <span className="kbcp-round__tagline">
                The race begins.
              </span>
            </div>

          </div>


          <div className="kbcp-round__content">

            <p>
              Round 1 is a fast-paced{" "}
              <strong>Fastest Fingers First</strong> challenge
              conducted through the <strong>Codepathi Live Arena</strong>.
            </p>

            <p>
              Participants answer questions as quickly and accurately
              as possible. Every correctly answered question contributes
              points to the official live leaderboard tally.
            </p>

          </div>


          <div className="kbcp-qualification">

            <div className="kbcp-qualification__icon">
              ★
            </div>

            <div>
              <span>
                QUALIFICATION
              </span>

              <strong>
                TOP 12 PLAYERS
              </strong>

              <p>
                The 12 highest-ranked players on the leaderboard
                advance to the Hot Seat round.
              </p>
            </div>

          </div>

        </article>


        {/* ROUND 2 */}

        <article className="kbcp-round">

          <div className="kbcp-round__heading">

            <div className="kbcp-round__number">
              02
            </div>

            <div>
              <span className="kbcp-round__eyebrow">
                ROUND TWO
              </span>

              <h3>
                The Hot Seat
              </h3>

              <span className="kbcp-round__tagline">
                Where the stakes get higher.
              </span>
            </div>

          </div>


          <div className="kbcp-round__content">

            <p>
              The top 12 players from Round 1 get their chance to
              enter the <strong>Hot Seat</strong>.
            </p>

            <p>
              The Hot Seat consists of a{" "}
              <strong>15-question ladder</strong>. As the player
              progresses, the stakes increase.
            </p>

            <p>
              The player can answer the question, use one of their
              lifelines, or step down with their secured prize money
              if they become stuck after using their available lifelines.
            </p>

            <p>
              If the Hot Seat player answers incorrectly or cannot
              complete a question, the <strong>next player</strong>
              takes the Hot Seat.
            </p>

          </div>


          <div className="kbcp-hotseat-stats">

            <div>
              <span>QUESTIONS</span>
              <strong>15</strong>
            </div>

            <div>
              <span>GRAND PRIZE</span>
              <strong>₹5,000</strong>
            </div>

          </div>

        </article>


        {/* LIFELINES */}

        <section className="kbcp-subsection">

          <div className="kbcp-subsection__header">
            <span>LIFELINES</span>

            <h3>
              Choose wisely.
            </h3>

            <p>
              Every Hot Seat player gets three lifelines.
              Each lifeline can be used only once.
            </p>
          </div>


          <div className="kbcp-lifelines">

            {LIFELINES.map((lifeline) => (
              <article
                key={lifeline.number}
                className="kbcp-lifeline"
              >

                <span className="kbcp-lifeline__number">
                  {lifeline.number}
                </span>

                <h4>
                  {lifeline.title}
                </h4>

                <p>
                  {lifeline.text}
                </p>

              </article>
            ))}

          </div>

        </section>


        {/* SIDE QUESTS */}

        <section className="kbcp-subsection">

          <div className="kbcp-subsection__header">
            <span>SIDE QUESTS</span>

            <h3>
              More ways to compete.
            </h3>

            <p>
              Additional coding challenges designed to test speed,
              logic, debugging, and creativity.
            </p>
          </div>


          <div className="kbcp-sidequests">

            {SIDE_QUESTS.map((quest) => (
              <article
                key={quest.number}
                className="kbcp-sidequest"
              >

                <span className="kbcp-sidequest__number">
                  {quest.number}
                </span>

                <h4>
                  {quest.title}
                </h4>

                <p>
                  {quest.text}
                </p>

              </article>
            ))}

          </div>

        </section>

      </div>
    </section>
  );
}