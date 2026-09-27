import { PROBLEM_QUESTION } from '../../app/content';
import { Callout, LinkButton, SectionTitle } from '../../ui/content';

export function Intro() {
  return (
    <>
      <div class="prose">
        <SectionTitle n="1.1">Einführung in das Thema Bahnstabilität</SectionTitle>
        <p>
          Seit über vier Milliarden Jahren umkreist der Mond die Erde. Ob eine Bahn so langfristig
          erhalten bleibt, ist eine der zentralen Fragen der Himmelsmechanik: Man nennt das
          <strong> Bahnstabilität</strong>. Eine Bahn ist stabil, wenn kleine Störungen sie nur
          leicht verformen, sie aber nicht zerstören. Sie ist instabil, wenn sich Störungen
          aufschaukeln, bis der Körper abstürzt oder davonfliegt.
        </p>
        <p>
          Für zwei Körper hat Newton das Problem vollständig gelöst. Sobald ein dritter Körper
          hinzukommt – im Fall des Mondes die Sonne – gibt es keine allgemeine Lösungsformel mehr.
          Die Frage nach der Stabilität muss dann mit Näherungen, Stabilitätskriterien und
          numerischen Simulationen beantwortet werden.
        </p>

        <SectionTitle n="1.2">Problemfrage der Arbeit</SectionTitle>
        <blockquote class="problem">
          <p>„{PROBLEM_QUESTION}“</p>
        </blockquote>
        <p>Die Frage lässt sich in drei Teilfragen zerlegen:</p>
        <ol>
          <li>
            Warum ist das heutige System stabil, obwohl die Sonne den Mond stärker anzieht als die
            Erde?
          </li>
          <li>Welche Bedingungen müssten sich ändern, damit der Mond auf die Erde stürzt?</li>
          <li>
            Welche Bedingungen müssten sich ändern, damit der Mond das Erde-Mond-System verlässt?
          </li>
        </ol>

        <SectionTitle n="1.3">Zielsetzung</SectionTitle>
        <p>
          Die Arbeit führt von den physikalischen Grundlagen (Kapitel 2) über die Störung durch die
          Sonne (Kapitel 3), die Lagrange-Punkte (Kapitel 4) und die Hill-Sphäre (Kapitel 5) bis zur
          langfristigen Entwicklung durch Gezeitenreibung (Kapitel 6). Kapitel 7 prüft mit denselben
          Werkzeugen die Hohle-Mond-Theorie. Den Kern bildet der Eigenanteil (Kapitel 8): eine
          digitale Drei-Körper-Simulation, mit der die Stabilitätsgrenzen numerisch bestimmt und mit
          der Theorie verglichen werden. Kapitel 9 beantwortet die Problemfrage.
        </p>
      </div>
      <Callout kind="fakt">
        Die Sonne zieht den Mond etwa 2,2-mal so stark an wie die Erde – und trotzdem bleibt er bei
        uns. Warum das so ist, zeigt Kapitel 3.
      </Callout>
      <div class="btn-row">
        <LinkButton to="kapitel-2" primary>
          Weiter zu den Grundlagen
        </LinkButton>
        <LinkButton to="simulator">Simulator ausprobieren</LinkButton>
      </div>
    </>
  );
}
