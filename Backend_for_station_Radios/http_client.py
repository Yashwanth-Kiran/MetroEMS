import requests
def http_get_text(url, auth=None, timeout=1.5):
    r = requests.get(url, auth=auth, timeout=timeout)
    r.raise_for_status()
    return r.text
