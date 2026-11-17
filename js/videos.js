'use strict';
/* Demo videos for each exercise. Every one was found by web search and confirmed to exist with
 * YouTube's official oEmbed check on 2026-11-17 (tools/video-check.tsv). First = main, second = backup. */
const VIDEOS = {
"Barbell Bench Press": [
{
"id": "rT7DgCr-3pg",
"title": "How To: Barbell Bench Press",
"channel": "ScottHermanFitness"
},
{
"id": "gRVjAtPip0Y",
"title": "How to Perform Bench Press - Tutorial & Proper Form",
"channel": "Buff Dudes"
}
],
"Weighted Pull-Up": [
{
"id": "QZue7F_Zk3A",
"title": "Weighted Pull-Up Tutorial | Back Strength & Power",
"channel": "Nottingham Physio"
},
{
"id": "7FjX1RODKzQ",
"title": "How To Do A Weighted Pull Up? | Weighted Pull Up Form Guide",
"channel": "Thibaut"
}
],
"Incline Dumbbell Press": [
{
"id": "sh5ZsRpEZCw",
"title": "How to Do the Incline Dumbbell Bench Press | Perfect Form in 30 Seconds",
"channel": "All Strength Training"
},
{
"id": "QEY2z5LtB9Y",
"title": "Incline Dumbbell Press - Exercise Tutorial",
"channel": "Coach Yuliya"
}
],
"Chest-Supported Row": [
{
"id": "h2Xafysr43E",
"title": "Chest Supported DB Row (Exercise Library)",
"channel": "Horton Barbell"
},
{
"id": "f0bFCVXB8hc",
"title": "Exercise Tutorial: Chest Supported DB Row",
"channel": "Travis Tarrant"
}
],
"Cable Fly": [
{
"id": "J2h--eoHK_U",
"title": "Cable Chest Fly Guide",
"channel": "Andrew Kwong (DeltaBolic)"
},
{
"id": "ETtXO4FW1EU",
"title": "TUTORIAL: How To Properly Do Cable Flyes",
"channel": "Wavvy Fitness"
}
],
"Barbell Curl": [
{
"id": "YVkRZyPFSZk",
"title": "Exercise Tutorial: Barbell Bicep Curl",
"channel": "Travis Tarrant"
},
{
"id": "lY4KlhILM2I",
"title": "How to Do a Barbell Curl",
"channel": "CodeBlue Fitness & Accountability"
}
],
"Incline Dumbbell Curl": [
{
"id": "DCe8f6vMe9A",
"title": "Stop Screwing Up Incline Dumbbell Curls (PROPER FORM!)",
"channel": "ATHLEAN-X™"
},
{
"id": "rAx_tf13V5k",
"title": "Incline Dumbbell Curl (How To | Form Tutorial)",
"channel": "Average To Jacked"
}
],
"Wrist Curl + Reverse Wrist Curl": [
{
"id": "04u4uGk3Ia8",
"title": "How To Perform Do Wrist Curls And Reverse Wrist Curls With Dumbbells",
"channel": "Whats Up Dude"
},
{
"id": "9lk8aAY8CiM",
"title": "Reverse Wrist Curls - Great Forearm Exercise",
"channel": "Victor Pantoja"
}
],
"Back Squat": [
{
"id": "1oed-UmAxFs",
"title": "How To: Barbell Squat | 3 GOLDEN RULES! (MADE BETTER!)",
"channel": "ScottHermanFitness"
},
{
"id": "-bJIpOq-LWk",
"title": "How to do a Barbell Back Squat",
"channel": "National Academy of Sports Medicine (NASM)"
}
],
"Overhead Press": [
{
"id": "F3QY5vMz_6I",
"title": "How to Perform Overhead Press - Proper Technique & Form",
"channel": "Buff Dudes"
},
{
"id": "3VpI0V_9D0Y",
"title": "How to Do the Standing Barbell Overhead Press | Perfect Form in 30 Seconds",
"channel": "All Strength Training"
}
],
"Romanian Deadlift": [
{
"id": "uhghy9pFIPY",
"title": "How To Perform PERFECT Romanian Deadlifts | RDLs (Everything You Need To Know)",
"channel": "E3 Rehab"
},
{
"id": "7j-2w4-P14I",
"title": "Romanian Deadlift | Nuffield Health",
"channel": "Nuffield Health"
}
],
"Hip Thrust": [
{
"id": "S_uZP4UH6J0",
"title": "How To Do A Barbell Hip Thrust The RIGHT Way! (FIX THIS!!!)",
"channel": "Mind Pump TV"
},
{
"id": "NDlzVV-UCHE",
"title": "Barbell Hip Thrust - Proper Form & Technique [4K]",
"channel": "Steev"
}
],
"Dumbbell Lateral Raise": [
{
"id": "3VcKaXpzqRo",
"title": "How To: Dumbbell Side Lateral Raise",
"channel": "ScottHermanFitness"
},
{
"id": "nnH63icHYXY",
"title": "Dumbbell Lateral Raise | Proper Form Tutorial for Bigger Shoulders",
"channel": "FIT.nl"
}
],
"Close-Grip Bench Press": [
{
"id": "cXbSJHtjrQQ",
"title": "CLOSE GRIP PRESS | Triceps | How-To Exercise Tutorial",
"channel": "Buff Dudes Workouts"
},
{
"id": "a2G3IdaTcPU",
"title": "How To Do The Close Grip Bench Press",
"channel": "SET FOR SET"
}
],
"Overhead Cable Triceps Extension": [
{
"id": "l4i7iDLiMXs",
"title": "Rope Overhead Tricep Extension — (FORM & TUTORIAL)",
"channel": "Fit Father Project - Fitness For Busy Fathers"
},
{
"id": "jioCqlKKrJc",
"title": "How To Do A Standing High Pulley Overhead Cable Triceps Extension With Rope | Exercise Demo Video",
"channel": "Live Lean TV Daily Exercises"
}
],
"Standing Calf Raise": [
{
"id": "yYBAQGtpIyM",
"title": "How To: Standing Machine Calf Raise",
"channel": "Live Lean TV Daily Exercises"
},
{
"id": "4HQ8Am9IuME",
"title": "Standing Calf Raise: Stop Bouncing, Start Growing",
"channel": "Mike | J2FIT Strength & Conditioning"
}
],
"Neck Flexion + Extension": [
{
"id": "o78kjeBJUBQ",
"title": "How To: Weight Plate Neck Curl",
"channel": "Live Lean TV Daily Exercises"
},
{
"id": "P2-ai4sNAvU",
"title": "Neck Extensions | Harness Exercises by Iron Neck",
"channel": "The Iron Neck"
}
],
"Dips": [
{
"id": "yN6Q1UI_xkE",
"title": "How To Do Dips For A Bigger Chest and Shoulders (Fix Mistakes!)",
"channel": "Jeff Nippard"
},
{
"id": "fwfZchB1mvA",
"title": "Dips Proper Form (Chest vs. Triceps)",
"channel": "Dave Rienzi"
}
],
"Lat Pulldown": [
{
"id": "rpkWBC1gCcE",
"title": "Beginner’s Guide: Lat Pull-Down (Step-by-Step Exercise Tutorial)",
"channel": "Tim Bullici"
},
{
"id": "AKl1em_pH_c",
"title": "How to Do the Lat Pulldown Correctly | Form & Mistakes Explained",
"channel": "Murrali Gurram "
}
],
"Incline Smith Machine Press": [
{
"id": "_SQoFGYBrb4",
"title": "How To INCLINE Bench Press On Smith Machine (BEGINNER )",
"channel": "Wavvy Fitness"
},
{
"id": "3lnMZ-_33qY",
"title": "Smith Machine Incline Bench Press - Chest Exercise",
"channel": "Fitness Arabia"
}
],
"Single-Arm Cable Row": [
{
"id": "oDKu4Y-hQtA",
"title": "How To Do A SINGLE ARM SEATED CABLE ROW | Exercise Demonstration Video and Guide",
"channel": "Live Lean TV Daily Exercises"
},
{
"id": "RNudExHiyds",
"title": "One-Arm Cable Row Tutorial",
"channel": "Adam Skoda"
}
],
"Pec Deck": [
{
"id": "hZ0CGRaKwbQ",
"title": "Pec Deck / Chest Fly: How To",
"channel": "Hammer Fitness"
},
{
"id": "-DZXcuPi4vk",
"title": "How To: Pec Deck Machine Fly",
"channel": "Live Lean TV Daily Exercises"
}
],
"Preacher Curl": [
{
"id": "e7X6G07KnPI",
"title": "EZ-Bar Preacher Curl | Proper Form Tutorial for Bigger Biceps",
"channel": "FIT.nl"
},
{
"id": "jilTTmyEoYY",
"title": "Barbell Preacher Curl | Proper Form for Bigger Biceps",
"channel": "Workouts for men over 40"
}
],
"Hammer Curl": [
{
"id": "zC3nLlEvin4",
"title": "How To: Dumbbell Hammer Curl",
"channel": "ScottHermanFitness"
},
{
"id": "CFBZ4jN1CMI",
"title": "How to do a Dumbbell Hammer Curl",
"channel": "National Academy of Sports Medicine (NASM)"
}
],
"Reverse Barbell Curl": [
{
"id": "YO98hq3vX7g",
"title": "Reverse Grip Barbell Curl (How To)",
"channel": "Willed Fitness"
},
{
"id": "Q1pHx6uvrnY",
"title": "Barbell reverse curl Tutorial",
"channel": "TrainToSmileTV"
}
],
"Leg Press": [
{
"id": "uRFWe2nOUjg",
"title": "Leg Press Machine Tutorial | Beginner’s Guide to Gym Machines (Build Muscle & Strength)",
"channel": "Tim Bullici"
},
{
"id": "P-FZknD_DxM",
"title": "Leg Press: Machine Workout Proper Form and Technique",
"channel": "FITNESS MEDIA"
}
],
"Seated Dumbbell Shoulder Press": [
{
"id": "qEwKCR5JCog",
"title": "How To: Dumbbell Shoulder Press",
"channel": "ScottHermanFitness"
},
{
"id": "WKEl69bIGus",
"title": "How to Do the Seated Dumbbell Shoulder Press | Perfect Form in 30 Seconds",
"channel": "All Strength Training"
}
],
"Bulgarian Split Squat": [
{
"id": "hiLF_pF3EJM",
"title": "Stop F*cking Up Bulgarian Split Squats (PROPER FORM!)",
"channel": "ATHLEAN-X™"
},
{
"id": "2YhcpVkhrH4",
"title": "Target Glutes & Quads: Proper Form For the Bulgarian Split Squat | Rear Foot Elevated Split Squat",
"channel": "Citizen Athletics"
}
],
"Cable Lateral Raise": [
{
"id": "qghfvzcoS2I",
"title": "Cable Lateral Raise (Exercise Library)",
"channel": "Horton Barbell"
},
{
"id": "gsC3pd6lfKY",
"title": "Cable Lateral Raise Explained",
"channel": "Peter Miljak"
}
],
"Leg Curl": [
{
"id": "SbSNUXPRkc8",
"title": "How To Do A Lying Leg Curl (Prone Leg Curl)",
"channel": "PureGym"
},
{
"id": "Z5pRnXaCjpM",
"title": "Seated Leg Curl: How To",
"channel": "Hammer Fitness"
}
],
"Rear Delt Fly": [
{
"id": "Lec8GC1SiS8",
"title": "Rear Delt Bent Over Flies: How To",
"channel": "Hammer Fitness"
},
{
"id": "UO_v23hHAdM",
"title": "Bent Over Dumbbell Rear Delt Flyes (Exercise Tutorial + Form Tips) | Team Evolve",
"channel": "Vivian Ngo"
}
],
"Tricep Pushdown": [
{
"id": "_w-HpW70nSQ",
"title": "HOW TO: Cable Triceps Pushdown || 3 Golden Rules (FOR GROWTH)",
"channel": "ScottHermanFitness"
},
{
"id": "xMCrTS_IPwg",
"title": "Cable Rope Pushdown Form Guide | Target Lateral Head & Maximize Lockout #RopePushdown #TricepGains",
"channel": "IronForm.Workout"
}
],
"Cable Crunch": [
{
"id": "kc0PRn372lo",
"title": "How To Do A KNEELING CABLE CRUNCH | Exercise Demonstration Video and Guide",
"channel": "Live Lean TV Daily Exercises"
},
{
"id": "0KEP6A1deBE",
"title": "Exercise Tutorial: Kneeling Cable Crunch",
"channel": "Travis Tarrant"
}
],
"Incline Barbell Press": [
{
"id": "2jFFCy8JBU8",
"title": "How To Do A Barbell Incline Bench Press",
"channel": "PureGym"
},
{
"id": "_aJHyS_JAaY",
"title": "How to do Incline Barbell Bench Press",
"channel": "MuscleWiki"
}
],
"Flat Dumbbell Press": [
{
"id": "Y_7aHqXeCfQ",
"title": "How To: Dumbbell Bench Press | 3 GOLDEN RULES",
"channel": "ScottHermanFitness"
},
{
"id": "omGiL5h2R_I",
"title": "How to Do Flat Bench Dumbbell Press",
"channel": "LIVESTRONG"
}
],
"Machine Chest Press": [
{
"id": "B-zyH8OTlsg",
"title": "Machine Chest Press: How To",
"channel": "Hammer Fitness"
},
{
"id": "4YpxZXFADmc",
"title": "How to Adjust & Use the Chest Press Machine Correctly",
"channel": "Fitness 19"
}
],
"Push-Up": [
{
"id": "Dt9Z7HEeQnk",
"title": "How to Do a Push-Up Properly | Push-Up Tutorial with Adrian (2 Min)",
"channel": "MOVEMENT LIVING"
},
{
"id": "s1X8e4JFdbE",
"title": "How To Do Push Ups Correctly",
"channel": "Jack Hanrahan Fitness "
}
],
"Ab Wheel Rollout": [
{
"id": "nCh8VfWY5_g",
"title": "How to do AB WHEEL Rollouts the Right Way (3 Tips!)",
"channel": "Redefining Strength"
},
{
"id": "PK4n7qJpOhM",
"title": "Ab Wheel Rollouts (Beginner to Advanced Progressions)",
"channel": "Zack Henderson"
}
],
"Deadlift": [
{
"id": "l5Ckg1lwVgE",
"title": "The PERFECT Conventional Deadlift (Complete Guide)",
"channel": "Kyriakos Michail"
},
{
"id": "cclUh49qOww",
"title": "How to Deadlift | 5 Solid Conventional Deadlift Form Cues for Beginners",
"channel": "BELLS OF STEEL"
}
],
"Barbell Row": [
{
"id": "kBWAon7ItDw",
"title": "How To PROPERLY Barbell Row For A Bigger Back (Stop Making These Mistakes!)",
"channel": "Jeremy Ethier"
},
{
"id": "-xlBxIMqh3A",
"title": "Bent Over Barbell Row - Back Exercise - Bodybuilding.com",
"channel": "Bodybuilding.com"
}
],
"Single-Arm Dumbbell Row": [
{
"id": "ZRSGpBUVcNw",
"title": "How To Do Single Arm Dumbbell Rows",
"channel": "PureGym"
},
{
"id": "yMtKjtfK1PM",
"title": "Single Arm Dumbbell Row (Tutorial + Tips) | Team Evolve",
"channel": "Vivian Ngo"
}
],
"Straight-Arm Pulldown": [
{
"id": "r34PR1mxzmU",
"title": "Straight-Arm Pulldown - Back Exercise - Bodybuilding.com",
"channel": "Bodybuilding.com"
},
{
"id": "70Ajji0V9vk",
"title": "Straight Arm Lat Pulldown (Exercise Library)",
"channel": "Horton Barbell"
}
],
"Barbell Shrug": [
{
"id": "UyeCwEW7mbM",
"title": "Everything You Need to Know About Shrugs | Dr. Jim Stoppani",
"channel": "Jim Stoppani, PhD"
},
{
"id": "X26Ji1j9LWA",
"title": "Barbell Shrugs - Tutorial",
"channel": "The Strength Institute"
}
],
"Wrist Roller": [
{
"id": "-lOFG0U_rlY",
"title": "Wrist Roller - Forearm Exercise - Bodybuilding.com",
"channel": "Bodybuilding.com"
},
{
"id": "gUYXMoBpT8o",
"title": "How to use The Wrist Roller for Stronger Wrists and Forearms",
"channel": "Seriously Strong Training"
}
],
"Face Pull": [
{
"id": "eTCBSFlCJ_s",
"title": "How to do a Face Pull | Proper Form & Technique | NASM",
"channel": "National Academy of Sports Medicine (NASM)"
},
{
"id": "7z65m-qWJrA",
"title": "Cable Face Pull (Exercise Library)",
"channel": "Horton Barbell"
}
],
"Cable Upright Row": [
{
"id": "dbJnZNI5YMg",
"title": "Cable Upright Row: A Shoulder-Friendly Way to Build Delts",
"channel": "Mike | J2FIT Strength & Conditioning"
},
{
"id": "4MvmUEHKtH8",
"title": "How to: Cable Upright Row",
"channel": "Rachel Scheer"
}
],
"Hanging Leg Raise": [
{
"id": "fLbZrF6MZuE",
"title": "Hanging Leg/Knee Raise Tutorial — Muscles Worked, Benefits, and Form",
"channel": "BarBend"
},
{
"id": "Nw0LOKe3_l8",
"title": "Hanging Leg Raise - Ab Exercise - Bodybuilding.com",
"channel": "Bodybuilding.com"
}
],
"Pull-Up": [
{
"id": "sxYkYNyC4j0",
"title": "How to Do Pull Up Correctly — The Cues Most People Miss (Beginner to Advanced)",
"channel": "Eric Higgins Coaching"
},
{
"id": "Y44dJcTEhJE",
"title": "How to Do a Perfect Pull-Up – Complete Beginner's Guide",
"channel": "Emilio Calisthenics"
}
],
"Seated Cable Row": [
{
"id": "oFtfkSElE0s",
"title": "Seated Cable Row: How To",
"channel": "Hammer Fitness"
},
{
"id": "OeLb503NZHk",
"title": "Seated Cable Row Tutorial: Build a Strong Back with Proper Form",
"channel": "The Healthy Habit"
}
],
"Leg Extension": [
{
"id": "3zWKiW9BBpo",
"title": "How to Do Leg Extensions with Perfect Form (The Proper Range of Motion)",
"channel": "Cris Edmonds TV"
},
{
"id": "EAR4tit2Dac",
"title": "How To Do Leg Extensions with a Machine | Leg Extension Exercise Demonstration",
"channel": "FITBODY with Julie Lohre"
}
],
"Skull Crusher": [
{
"id": "BRidxBmaoX0",
"title": "How to do a Skull Crusher",
"channel": "Blackstone Labs"
},
{
"id": "UCnIm8l8Bxc",
"title": "EZ Bar Skull Crusher",
"channel": "Matt Klingler"
}
],
"Plank": [
{
"id": "mwlp75MS6Rg",
"title": "How to do a Plank | Proper Form & Technique | NASM",
"channel": "National Academy of Sports Medicine (NASM)"
},
{
"id": "6LqqeBtFn9M",
"title": "How to do the perfect PLANK: technique and common mistakes",
"channel": "Get Exercise Confident"
}
],
"Treadmill": [
{
"id": "Ii71nAaRc_8",
"title": "Incline Walking On The Treadmill (Tutorial + Tips) | Team Evolve",
"channel": "Vivian Ngo"
},
{
"id": "dogmDmtz6H0",
"title": "Personal Fitness & Health : How to Use a Treadmill",
"channel": "eHowFitness"
}
],
"Rowing Machine": [
{
"id": "JunqWhTXTJs",
"title": "Basics of the Concept2 Rowing Technique",
"channel": "ErgFit (Concept2 NZ)"
},
{
"id": "QPvYrfyGHi8",
"title": "Concept2 Technique Video on the Indoor Rower",
"channel": "ErgFit (Concept2 NZ)"
}
]
};
