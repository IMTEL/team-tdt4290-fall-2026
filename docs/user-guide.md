# User guide: getting started

For **career counselors and other new users** of the app: how to set up an AI interviewer, try
it, and make it available to job seekers in the VR app The Candidate. No technical knowledge is
needed. The app itself is in Norwegian; the names of buttons and pages are shown here in **bold**,
as they appear on screen.

If you are a developer, start with the [README](../README.md) instead. If you are assessing the
project, see the [guide for the sensor](sensor-guide.md).

## Contents

- [What the app does](#what-the-app-does)
- [1. Log in](#1-log-in)
- [2. Set up your first interviewer](#2-set-up-your-first-interviewer)
- [3. Test the interviewer](#3-test-the-interviewer)
- [4. Publish it to The Candidate](#4-publish-it-to-the-candidate)
- [5. Look after your agents](#5-look-after-your-agents)
- [6. Make templates to save time](#6-make-templates-to-save-time)
- [7. Your profile](#7-your-profile)
- [Good to know](#good-to-know)
- [Words used in the app](#words-used-in-the-app)

## What the app does

You describe a job interview: the job, the employer, who interviews, who the job seeker is, and how
hard it should be. The app turns your answers into an AI interviewer (an _agent_). You can talk to
it yourself first, then publish it, so the job seeker can practise the interview with it in VR.

```
Set up (Ny agent)  →  Test (Test agenten)  →  Publish (Publiser til The Candidate)  →  Job seeker practises in VR
```

## 1. Log in

1. Open the app and click **Logg inn** in the top right corner.
2. Sign in with your user name and password. The first time, you can make an account with
   **Opprett konto**.
3. You come back to the app. Your name is shown at the top, and **Logg ut** is next to it.

The menu at the top has three pages: **Hjem** (the start page), **Agenter** (your interviewers)
and **Maler** (templates).

## 2. Set up your first interviewer

Click **Ny agent** on the start page (or the «Ny agent» card under **Agenter**). The set-up has
five steps, shown at the top. Fields marked with a star must be filled in before you can go on.

| Step                         | What you decide                                                                                                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Stilling og arbeidsplass** | The job the job seeker is practising for, the industry, whether the employer is public or private, and optionally the company. Pick a ready-made job (_stillingsmal_) to fill most of it in |
| **Intervjuer**               | Who interviews, for example «Daglig leder» or «HR-medarbeider» (_intervjuermal_). You can continue without one. Tick laws and rules the interviewer must follow (**Lovverk**)               |
| **Jobbsøker**                | Who the job seeker is (_jobbsøkermal_), and what they want to practise, such as nervousness or explaining a gap in the CV                                                                   |
| **Innstillinger**            | First or second interview, difficulty, number of questions, follow-up questions, and questions that must be asked                                                                           |
| **Fullføre**                 | An overview of your choices, **«Slik former svarene dine agenten»** (how each answer changes the interviewer), an avatar picture and a name                                                 |

On the last step, choose one of:

- **Publiser** saves the interviewer and takes you to **Agenter**. It is still private: only you
  can see it, and it is not in The Candidate yet (see step 4).
- **Lagre som utkast** saves it the same way.
- **Test agenten** saves it and opens a test chat at once.

Need a break halfway? **Lagre utkast** keeps what you have filled in, on this computer and in this
browser only. You find it as an **Utkast** card under **Agenter**, where you can continue or delete
it.

**Never write anything that identifies the job seeker**: no names, birth dates, addresses or
health information. Describe them in general terms, such as an age group and their experience.

## 3. Test the interviewer

Open the interviewer under **Agenter** and click **Test agenten**. You play the job seeker:

- Type your answers as the job seeker would. The interviewer asks its questions one at a time.
- Rate a reply with **thumbs up** or **thumbs down**, and add a comment if you like. This helps you remember
  what to change.
- Click **Be om tilbakemelding** to have a separate AI observer comment on the answers given so far:
  what went well and what could be better. It needs at least two answers from the job seeker.
- **Start på nytt** starts the conversation over.

Not happy? Go back to the interviewer and click **Rediger** to change your answers, then test again.

You can send about 30 messages a minute. If you send more, the app asks you to wait a moment.

## 4. Publish it to The Candidate

When the interviewer behaves as you want:

1. Open it under **Agenter**.
2. Click **Publiser**.
3. Write a **public name** and a **short description**. These two texts are all The Candidate shows,
   and every user of The Candidate can see them. **Do not write anything about the job seeker here.**
4. Confirm. The interviewer is now marked **Publisert i The Candidate**.

The job seeker starts The Candidate, picks the interviewer from the list by its public name, and
practises the interview in VR.

To take it out of The Candidate, click **Gjem agent**. You can publish it again later.

If you **edit** a published interviewer, it is hidden from The Candidate automatically, so a job
seeker never meets a version you have not tested. Test it, then publish it again.

## 5. Browse your agents

**Agenter** lists all your interviewers. Search by any word in the name or the answers, for example
the job title. Open one to see:

- a short summary, and how your answers shape it;
- the tabs **Konfigurasjon** (your answers), **Avanserte innstillinger** and **Systemprompt** (the
  instructions the AI gets, built from your answers).

The buttons at the top:

| Button                        | What it does                                                                                 |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| **Test agenten**              | Opens the test chat                                                                          |
| **Rediger**                   | Change the name, the answers and the picture                                                 |
| **Klon**                      | Make a copy to change, for example the same job for another job seeker. The original is kept |
| **Publiser** / **Gjem agent** | Show or hide the interviewer in The Candidate                                                |
| **Slett**                     | Delete it for good, after you confirm. This can't be undone                                  |

**Advanced settings** (for experienced users): under **Avanserte innstillinger** in the edit form
you can choose the language model, the temperature (how varied the replies are) and even write the
system prompt yourself. A prompt you write yourself does not get the built-in safety rules, such as
never asking about health or religion, so add them yourself.

## 6. Make templates to save time

Under **Maler** you keep texts you use again and again. The app comes with some built-in
templates, which can't be changed. You can add your own, and only you can see them.

| Template            | What it fills in                                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Stillingsmaler**  | A job: title, industry, employer and a job description                                                                                                 |
| **Bransjemaler**    | An industry, with a short text about it for the interviewer                                                                                            |
| **Intervjuermaler** | Who the interviewer is and how they behave                                                                                                             |
| **Jobbsøkermaler**  | An anonymous job seeker: age group, experience, education, languages and what to practise. Your private notes on it are never given to the interviewer |
| **Lovverk**         | A law or rule about hiring, in plain words, such as what an employer may not ask                                                                       |

Changing or deleting a template does not change interviewers you have already made with it.

## 7. Your profile

Click your name at the top to open **Min profil**. There you can change your name and picture,
choose a light, dark or system theme, and see your agents and templates in one place.

## Good to know

- **Everything is private until you publish.** Other counselors can't see your interviewers or
  templates.
- **The AI can make mistakes.** Always test an interviewer before you publish it, and stay with the
  job seeker when they use it for the first time.
- **No real personal data.** Never write names or anything else that could identify a job seeker,
  anywhere in the app.
- **Something went wrong?** In a chat, click **Prøv igjen**. In a form, what you typed is kept, so
  you can try saving again. If it keeps failing, log out and in again, or contact the people who
  run the app.

## Words used in the app

| Norwegian          | Meaning                                             |
| ------------------ | --------------------------------------------------- |
| Agent              | An AI interviewer you have set up                   |
| Utkast             | A draft: a set-up you have not finished             |
| Mal / maler        | Template(s)                                         |
| Stilling           | The job being applied for                           |
| Bransje            | Industry                                            |
| Jobbsøker          | Job seeker                                          |
| Lovverk            | Laws and rules the interviewer must follow          |
| Publisere / Gjemme | Publish to / hide from The Candidate                |
| Systemprompt       | The written instructions the AI interviewer follows |
| Veileder           | Counselor                                           |
