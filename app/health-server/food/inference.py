

import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models, transforms
from PIL import Image
import io
import pandas as pd
import os

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

model = None
idx_to_class = None
nutrition_df = None


BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(BASE_DIR, "..", "model", "food101_model.pth")
DATA_PATH = os.path.join(BASE_DIR, "..", "model", "nutrition.csv")


#  LOAD MODEL + DATA
def load_model():
    global model, idx_to_class, nutrition_df

    if model is None:
        print("🍔 Loading food model...")

        model = models.resnet50()
        model.fc = nn.Sequential(
            nn.Dropout(0.4),
            nn.Linear(model.fc.in_features, 101)
        )

        checkpoint = torch.load(MODEL_PATH, map_location=device)

        model.load_state_dict(checkpoint['model_state_dict'])
        idx_to_class = checkpoint['idx_to_class']

        model.to(device)
        model.eval()

        nutrition_df = pd.read_csv(DATA_PATH)

        print("✅ Food model loaded")


#  PREPROCESSING (same as notebook)
transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])



def calculate_nutrition(food_name):
    global nutrition_df

    food_data = nutrition_df[
        nutrition_df['label'].str.contains(food_name, case=False)
    ]

    if food_data.empty:
        return None

    row = food_data.iloc[0]

    return {
        "calories": int(row["calories"]) if pd.notna(row["calories"]) else None,
        "protein": float(row["protein"]) if pd.notna(row["protein"]) else None,
        "carbs": float(row["carbohydrates"]) if pd.notna(row["carbohydrates"]) else None,
        "fat": float(row["fats"]) if pd.notna(row["fats"]) else None,
    }


#  MAIN FUNCTION FOR API
def predict_food(image_bytes):
    global model, idx_to_class

    if model is None:
        load_model()

    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    tensor = transform(image).unsqueeze(0).to(device)

    with torch.no_grad():
        outputs = model(tensor)
        probs = F.softmax(outputs, dim=1)
        conf, pred = torch.max(probs, 1)

    food_name = idx_to_class[pred.item()]

    return {
        "food": food_name,
        "confidence": float(conf.item()),
        "nutrition": calculate_nutrition(food_name)
    }