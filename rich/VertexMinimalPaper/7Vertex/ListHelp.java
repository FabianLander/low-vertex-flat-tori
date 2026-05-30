import java.util.Arrays;

/**This file helps with manipulating lists*/

public class ListHelp {

    /**prints out an integer list*/
    
    public static void printout(int[] list) {
	if(list==null) return;
	for(int i=0;i<list.length;++i) System.out.print(list[i]+" ");
	System.out.println("");
    }

    /**checks if two lists match up to permutation*/
    
    public static boolean match(int[] a,int[] b) {
	if(a.length!=b.length) return false;
	int[] aa=Arrays.copyOf(a,a.length);
	int[] bb=Arrays.copyOf(b,b.length);
	Arrays.sort(aa);
	Arrays.sort(bb);
	for(int i=0;i<a.length;++i) {
	    if(aa[i]!=bb[i]) return false;
	}
	return true;
    }

    /**checks if element a is amongst the first k elements of list b*/
    
    public static boolean onList(int a,int[] b,int k) {
	for(int i=0;i<k;++i) {
	    if(a==b[i]) return true;
	}
	return false;
    }


    /**take an integer list, sorts it, and removes redundancies*/
    
  public static int[] irredundantSortedList(int[] data) {
    Arrays.sort(data);
    int n=data.length;
    int[] temp = new int[n];
    int count = 0;
    for (int i = 0; i < n; ++i) {
        if ((i == 0) ||(data[i] != data[i - 1])) {
            temp[count] = data[i];
	    ++count;
        }
    }
    return Arrays.copyOf(temp, count);
}


    
    /**Gives all the 6 element subsets of {0,...,20} having
      0 as the first element*/

public static int[] subsetGenerator(int index) {
    int[] subset = {0,0,0,0,0,0};
    int x = 1;

    for (int i=1; i<6 ;++i) {
        while(choose(20-x,5-i)<=index) {
            index = index - choose(20 - x, 5 - i);
            ++x;
        }
        subset[i] = x;
        ++x;
    }
    return subset;
}

    /**This returns n choose k.*/
    
    public static int choose(int n,int k) {
	int x=1;
	int y=1;
	for(int i=1;i<=k;++i) {
	    x=x*(n-i+1);
	    y=y*i;
	}
	return x/y;
    }

    /**Gets the kth dihedral permutation of list a*/
    
    public static int[] perDihedral(int[] a,int k) {
	int n=a.length;
	if(k<n) return cycle(a,k);
	return reverse(cycle(a,k));
    }

    /**reverses list a*/
    
    public static int[] reverse(int[] a) {
	int n=a.length;
	int[] b=new int[n];
	for(int i=0;i<n;++i) b[i]=a[n-i-1];
	return b;
    }

    /**cycles list a by k clicks*/
    public static int[] cycle(int[] a,int k) {
	int n=a.length;
	int[] b=new int[n];
	for(int i=0;i<n;++i) b[i]=a[(i+k)%n];
	return b;
    }



    

    /**Gets the kth permutation of the set elements.
       This routine is only used for debugging purposes*/
    
    public static int[] per(int[] elements,int k) {
	int n=elements.length;
        int[] result = new int[n];
        boolean[] used = new boolean[n];
        int[] factorial = {1, 1, 2, 6, 24, 120, 720, 5040};  // factorial[n]

        for (int i = 0; i < n; i++) {
            int f = factorial[n-1 - i];
            int index = k / f;
            k = k % f;

            // Select the index-th unused number
            int count = -1;
            for (int j = 0; j < n; j++) {
                if (!used[j]) {
                    count++;
                }
                if (count == index) {
                    result[i] = elements[j];
                    used[j] = true;
                    break;
                }
            }
        }

        return result;
    }

    public static int factorial(int k) {
      int[] f = {1, 1, 2, 6, 24, 120, 720, 5040};
      return f[k];
    }
    

}


