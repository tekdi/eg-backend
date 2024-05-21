import pytesseract
import cv2
from PIL import Image
import sys

def preprocess_image(image_path):
    # Read image using OpenCV
    image = cv2.imread(image_path, cv2.IMREAD_COLOR)
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    # Apply thresholding
    gray = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)[1]
    # Save the processed image temporarily
    processed_image_path = "processed_image.png"
    cv2.imwrite(processed_image_path, gray)
    return processed_image_path

def extract_text(image_path):
    processed_image_path = preprocess_image(image_path)
    # Use Tesseract to extract text
    text = pytesseract.image_to_string(Image.open(processed_image_path))
    return text

if __name__ == "__main__":
    image_path = sys.argv[1]
    text = extract_text(image_path)
    print(text)
