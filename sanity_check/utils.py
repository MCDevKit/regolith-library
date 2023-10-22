import os


class Issue(object):
    def __init__(self, message, fixFunc):
        self.message = message
        self.fixFunc = fixFunc
    
    def can_fix(self):
        return self.fixFunc is not None
    
    def fix(self):
        if self.fixFunc is not None:
            self.fixFunc()

def levenshtein_distance(s1, s2):
    # If one of the strings is empty, the distance is the length of the other string
    if len(s1) == 0:
        return len(s2)
    if len(s2) == 0:
        return len(s1)

    # Initialize a matrix of size (len(s1) + 1) x (len(s2) + 1)
    matrix = [[0 for n in range(len(s2) + 1)] for m in range(len(s1) + 1)]

    # Initialize the first row and column
    for i in range(len(s1) + 1):
        matrix[i][0] = i
    for j in range(len(s2) + 1):
        matrix[0][j] = j

    # Fill in the matrix
    for i in range(1, len(s1) + 1):
        for j in range(1, len(s2) + 1):
            if s1[i - 1] == s2[j - 1]:
                cost = 0
            else:
                cost = 1

            matrix[i][j] = min(
                matrix[i - 1][j] + 1,  # Deletion
                matrix[i][j - 1] + 1,  # Insertion
                matrix[i - 1][j - 1] + cost,
            )  # Substitution

    return matrix[len(s1)][len(s2)]


def find_closest(string, valid_entries):
    closest = None
    closest_distance = None
    for entry in valid_entries:
        distance = levenshtein_distance(string, entry)
        if closest_distance is None or distance < closest_distance:
            closest = entry
            closest_distance = distance
    return closest, closest_distance


def list_files_with_extension(base_path, extensions):
    extensions = [ext.lower() for ext in extensions]

    matching_files = []

    for dirpath, _, filenames in os.walk(base_path):
        for filename in filenames:
            if filename.lower().endswith(tuple(extensions)):
                matching_files.append(os.path.join(dirpath, filename))

    return matching_files
