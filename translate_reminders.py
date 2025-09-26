import os
import pandas as pd
import json
from openai import OpenAI
from dotenv import load_dotenv
from tqdm import tqdm

# Load environment variables
load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def get_persian_translation(english_long_reminder, english_lesson_text, persian_lesson_text):
    prompt = f"""
    You are a highly skilled translator specializing in "A Course in Miracles" texts.
    Your task is to translate the following English reminder into Persian.
    It is crucial that the Persian translation is consistent in terminology, tone, and phrasing with the provided Persian lesson text.
    The translation should be concise and capture the essence of the English reminder, but use vocabulary and expressions found in the Persian lesson text.

    English Reminder to Translate:
    '''
    {english_long_reminder}
    '''

    English Lesson Text (for context):
    '''
    {english_lesson_text}
    '''

    Persian Lesson Text (for terminology and style consistency):
    '''
    {persian_lesson_text}
    '''

    Please provide only the Persian translation of the reminder, without any additional commentary or formatting.
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.0, # Keep it low for more deterministic translation
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error calling OpenAI API: {e}")
        return None

def process_lessons(csv_path, json_path):
    # Read ACIM Alarm.csv
    df = pd.read_csv(csv_path)
    df = df.dropna(axis=1, how='all') # Drop columns that are entirely NaN

    # Read lessons.json
    with open(json_path, 'r', encoding='utf-8') as f:
        lessons_data = json.load(f)

    for index, row in tqdm(df.iterrows(), total=df.shape[0], desc="Translating reminders"):
        day = str(int(row['day'])) # Ensure day is a string key
        english_long_reminder = row['long']

        if day in lessons_data:
            # Assuming there's only one lesson object per day in the array
            lesson_entry = lessons_data[day][0]

            # Skip if already translated
            if 'repetitionTextLong' in lesson_entry and 'fa' in lesson_entry['repetitionTextLong']:
                print(f"Skipping Day {day}, already translated.")
                continue

            english_lesson_text = lesson_entry['text']['en']
            persian_lesson_text = lesson_entry['text']['fa']

            persian_long_reminder = get_persian_translation(
                english_long_reminder,
                english_lesson_text,
                persian_lesson_text
            )

            if persian_long_reminder:
                lesson_entry['repetitionTextLong'] = {
                    'en': english_long_reminder,
                    'fa': persian_long_reminder
                }
                lessons_data[day][0] = lesson_entry

                # Write updated lessons.json after each successful translation
                with open(json_path, 'w', encoding='utf-8') as f:
                    json.dump(lessons_data, f, ensure_ascii=False, indent=2)
            else:
                print(f"Skipping Day {day} due to API error.")

        else:
            print(f"Warning: Day {day} from CSV not found in lessons.json. Skipping.")

    print(f"Updated {json_path} with new repetitionTextLong field.")

# Define file paths
csv_file = "/home/saeed/projects/telegram-acim-bot/ACIM Alarm.csv"
json_file = "/home/saeed/projects/telegram-acim-bot/data/lessons.json"

# Run the processing
process_lessons(csv_file, json_file)